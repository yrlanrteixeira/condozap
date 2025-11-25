import { useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState } from "@/store/index";

// Use throughout your app instead of plain `useSelector`
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
