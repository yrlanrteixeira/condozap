import { useDispatch, type TypedUseDispatchHook } from "react-redux";
import type { AppDispatch } from "@/store/index";

// Use throughout your app instead of plain `useDispatch`
export const useAppDispatch: () => AppDispatch = useDispatch;

