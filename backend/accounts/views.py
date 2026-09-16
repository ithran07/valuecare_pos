from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    EmployeeSerializer,
    LoginSerializer,
    UserSerializer,
)


# ============================================================
# EMPLOYEE MANAGEMENT PERMISSION
# ============================================================

def can_manage_employees(user):
    return (
        user.is_authenticated
        and user.role in {
            User.Role.SUPER_ADMIN,
            User.Role.ADMIN,
        }
    )


# ============================================================
# LOGIN
# ============================================================

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        employee_id = serializer.validated_data["employee_id"]
        password = serializer.validated_data["password"]

        user = User.objects.filter(
            employee_id__iexact=employee_id,
            is_active=True,
        ).first()

        if user and not user.check_password(password):
            user = None

        if not user:
            return Response(
                {
                    "detail": "Invalid credentials."
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# CURRENT USER
# ============================================================

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            UserSerializer(request.user).data,
            status=status.HTTP_200_OK,
        )


# ============================================================
# CHANGE OWN PASSWORD
# ============================================================

class ChangePasswordView(APIView):
    """
    Allows any authenticated employee to change their
    own password.

    The employee must provide:
        - current_password
        - new_password
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        current_password = request.data.get(
            "current_password"
        )

        new_password = request.data.get(
            "new_password"
        )

        # ----------------------------------------------------
        # Required fields
        # ----------------------------------------------------

        if not current_password:
            return Response(
                {
                    "detail": "Current password is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not new_password:
            return Response(
                {
                    "detail": "New password is required."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = request.user

        # ----------------------------------------------------
        # Check current password
        # ----------------------------------------------------

        if not user.check_password(current_password):
            return Response(
                {
                    "detail": "Current password is incorrect."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # Check if new password is the same
        # ----------------------------------------------------

        if user.check_password(new_password):
            return Response(
                {
                    "detail": (
                        "Your new password must be "
                        "different from your current password."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # Django password validation
        # ----------------------------------------------------

        try:
            validate_password(
                new_password,
                user=user,
            )

        except ValidationError as error:
            return Response(
                {
                    "detail": error.messages[0]
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ----------------------------------------------------
        # Set new password
        # ----------------------------------------------------

        user.set_password(new_password)

        user.save(
            update_fields=["password"]
        )

        return Response(
            {
                "detail": "Password changed successfully."
            },
            status=status.HTTP_200_OK,
        )


# ============================================================
# EMPLOYEE LIST + CREATE
# ============================================================

class EmployeeListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    # --------------------------------------------------------
    # VIEW EMPLOYEES
    # --------------------------------------------------------

    def get(self, request):

        if not can_manage_employees(request.user):
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to manage employees."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        users = User.objects.all().order_by(
            "first_name",
            "last_name",
            "username",
        )

        # ----------------------------------------------------
        # Admin cannot see Super Admin accounts
        # ----------------------------------------------------

        if request.user.role == User.Role.ADMIN:
            users = users.exclude(
                role=User.Role.SUPER_ADMIN
            )

        return Response(
            EmployeeSerializer(
                users,
                many=True
            ).data,
            status=status.HTTP_200_OK,
        )

    # --------------------------------------------------------
    # CREATE EMPLOYEE
    # --------------------------------------------------------

    def post(self, request):

        if not can_manage_employees(request.user):
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to manage employees."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        requested_role = request.data.get("role")

        # ----------------------------------------------------
        # Admin cannot create Super Admin
        # ----------------------------------------------------

        if (
            request.user.role == User.Role.ADMIN
            and requested_role == User.Role.SUPER_ADMIN
        ):
            return Response(
                {
                    "detail": (
                        "Admins cannot create "
                        "Super Admin accounts."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EmployeeSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        employee = serializer.save()

        return Response(
            EmployeeSerializer(employee).data,
            status=status.HTTP_201_CREATED,
        )


# ============================================================
# EMPLOYEE DETAIL
# ============================================================

class EmployeeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    # --------------------------------------------------------
    # UPDATE EMPLOYEE
    # --------------------------------------------------------

    def patch(self, request, employee_id):

        if not can_manage_employees(request.user):
            return Response(
                {
                    "detail": (
                        "You do not have permission "
                        "to manage employees."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            employee = User.objects.get(
                employee_id=employee_id
            )

        except User.DoesNotExist:
            return Response(
                {
                    "detail": "Employee not found."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # ----------------------------------------------------
        # Admin cannot edit Super Admin
        # ----------------------------------------------------

        if (
            request.user.role == User.Role.ADMIN
            and employee.role == User.Role.SUPER_ADMIN
        ):
            return Response(
                {
                    "detail": (
                        "Admins cannot edit "
                        "Super Admin accounts."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        requested_role = request.data.get("role")

        # ----------------------------------------------------
        # Admin cannot assign Super Admin role
        # ----------------------------------------------------

        if (
            request.user.role == User.Role.ADMIN
            and requested_role == User.Role.SUPER_ADMIN
        ):
            return Response(
                {
                    "detail": (
                        "Admins cannot assign "
                        "the Super Admin role."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = EmployeeSerializer(
            employee,
            data=request.data,
            partial=True,
        )

        serializer.is_valid(
            raise_exception=True
        )

        employee = serializer.save()

        return Response(
            EmployeeSerializer(employee).data,
            status=status.HTTP_200_OK,
        )