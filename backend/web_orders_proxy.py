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
    return {
        "X-Staff-Api-Key": settings.WEBSTORE_STAFF_API_KEY
    }


class WebOrderListProxyView(APIView):
    permission_classes = [CanManageWebOrders]

    def get(self, request):
        status_param = request.query_params.get(
            "status",
            "PENDING,CONTACTED",
        )

        resp = requests.get(
            f"{settings.WEBSTORE_API_URL}/staff/orders/",
            params={"status": status_param},
            headers=_staff_headers(),
            timeout=10,
        )

        return Response(
            resp.json(),
            status=resp.status_code,
        )


class WebOrderDetailProxyView(APIView):
    permission_classes = [CanManageWebOrders]

    def patch(self, request, pk):
        resp = requests.patch(
            f"{settings.WEBSTORE_API_URL}/staff/orders/{pk}/",
            json=request.data,
            headers=_staff_headers(),
            timeout=10,
        )

        return Response(
            resp.json(),
            status=resp.status_code,
        )