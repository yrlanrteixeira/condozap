import { useAppSelector } from "./useAppSelector";
import { useAppDispatch } from "./useAppDispatch";
import {
  login as loginAction,
  logout as logoutAction,
  selectAuth,
  selectUser,
  selectIsAuthenticated,
  selectUserRole,
} from "@/store/slices/authSlice";
import type { LoginRequest } from "@/types/user";

/**
 * Custom hook for authentication
 */
export const useAuth = () => {
  const dispatch = useAppDispatch();
  const auth = useAppSelector(selectAuth);
  const user = useAppSelector(selectUser);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const userRole = useAppSelector(selectUserRole);

  const login = async (credentials: LoginRequest) => {
    return dispatch(loginAction(credentials)).unwrap();
  };

  const logout = () => {
    dispatch(logoutAction());
  };

  return {
    user,
    isAuthenticated,
    userRole,
    isLoading: auth.isLoading,
    login,
    logout,
  };
};
