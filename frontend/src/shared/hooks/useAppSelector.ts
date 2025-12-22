import { useSelector, type TypedUseSelectorHook } from "react-redux";
import type { RootState } from "@/shared/store";

// Use throughout your app instead of plain `useSelector`
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
