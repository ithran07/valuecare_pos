
import requests

from django.conf import settings
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView


class CanManageWebOrders(BasePermission):
    """
    Only employees who are allowed to manage website orders
    can access the web-order proxy.
    """

    allowed_roles = {
        "SUPER_ADMIN",
        "ADMIN",
        "MANAGER",
        "SALES",
    }

    message = "You do not have permission to manage website orders."

    def has_permission(self, request, view):
        user = request.user

        return (
            user
            and user.is_authenticated
            and user.role in self.allowed_roles
        )


def _staff_headers():
    api_key = settings.WEBSTORE_STAFF_API_KEY

    return {
        "X-Staff-Api-Key": api_key,
        "Accept": "application/json",
    }


def _proxy_response(resp):
    """
    Return the website backend response safely.

    The website backend should normally return JSON.
    If it returns HTML/text instead, expose enough information
    to diagnose the problem instead of crashing with JSONDecodeError.
    """

    content_type = resp.headers.get("Content-Type", "")

    try:
        data = resp.json()
    except ValueError:
        return Response(
            {
                "detail": "The website backend returned a non-JSON response.",
                "remote_status": resp.status_code,
                "remote_content_type": content_type,
                "remote_response": resp.text[:2000],
            },
            status=502,
        )

    return Response(data, status=resp.status_code)


class WebOrderListProxyView(APIView):
    permission_classes = [CanManageWebOrders]

    def get(self, request):
        status_param = request.query_params.get(
            "status",
            "PENDING,CONTACTED",
        )

        base_url = (
            settings.WEBSTORE_API_URL or ""
        ).rstrip("/")

        if not base_url:
            return Response(
                {
                    "detail": (
                        "WEBSTORE_API_URL is not configured."
                    )
                },
                status=500,
            )

        api_url = f"{base_url}/staff/orders/"

        try:
            resp = requests.get(
                api_url,
                params={
                    "status": status_param,
                },
                headers=_staff_headers(),
                timeout=15,
            )

        except requests.exceptions.Timeout:
            return Response(
                {
                    "detail": (
                        "The website backend request timed out."
                    ),
                    "url": api_url,
                },
                status=504,
            )

        except requests.exceptions.ConnectionError as error:
            return Response(
                {
                    "detail": (
                        "Could not connect to the website backend."
                    ),
                    "url": api_url,
                    "error": str(error),
                },
                status=502,
            )

        except requests.exceptions.RequestException as error:
            return Response(
                {
                    "detail": (
                        "The website backend request failed."
                    ),
                    "url": api_url,
                    "error": str(error),
                },
                status=502,
            )

        return _proxy_response(resp)


class WebOrderDetailProxyView(APIView):
    permission_classes = [CanManageWebOrders]

    def patch(self, request, pk):
        base_url = (
            settings.WEBSTORE_API_URL or ""
        ).rstrip("/")

        if not base_url:
            return Response(
                {
                    "detail": (
                        "WEBSTORE_API_URL is not configured."
                    )
                },
                status=500,
            )

        api_url = f"{base_url}/staff/orders/{pk}/"

        try:
            resp = requests.patch(
                api_url,
                json=request.data,
                headers=_staff_headers(),
                timeout=15,
            )

        except requests.exceptions.Timeout:
            return Response(
                {
                    "detail": (
                        "The website backend request timed out."
                    ),
                    "url": api_url,
                },
                status=504,
            )

        except requests.exceptions.ConnectionError as error:
            return Response(
                {
                    "detail": (
                        "Could not connect to the website backend."
                    ),
                    "url": api_url,
                    "error": str(error),
                },
                status=502,
            )

        except requests.exceptions.RequestException as error:
            return Response(
                {
                    "detail": (
                        "The website backend request failed."
                    ),
                    "url": api_url,
                    "error": str(error),
                },
                status=502,
            )

        return _proxy_response(resp)

