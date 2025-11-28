import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage
import themeReducer from "./slices/themeSlice";
import userReducer from "./slices/userSlice";
import condominiumReducer from "./slices/condominiumSlice";
import uiReducer from "./slices/uiSlice";

// Persist config - persiste theme, user e condominium
const persistConfig = {
  key: "condozap-root",
  version: 1,
  storage,
  whitelist: ["theme", "user", "condominium"], // Persiste preferências do usuário
};

// Combine reducers
const rootReducer = combineReducers({
  theme: themeReducer,
  user: userReducer,
  condominium: condominiumReducer,
  ui: uiReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: import.meta.env.DEV,
});

// Create persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
