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
import authReducer from "./slices/authSlice";
import themeReducer from "./slices/themeSlice";
import uiReducer from "./slices/uiSlice";
import userReducer from "./slices/userSlice";
import condominiumReducer from "./slices/condominiumSlice";
import {
  authMiddleware,
  authLoggingMiddleware,
} from "./middleware/authMiddleware";

// Persist config - persiste theme, condominium, ui e user
const persistConfig = {
  key: "condozap-root", // Changed from ivijur-root
  version: 1,
  storage,
  whitelist: ["theme", "condominium", "ui", "user"], // Persiste dados não-sensíveis
  blacklist: ["auth"], // Auth tem sua própria config de persistência
};

// Auth persist config - persiste dados necessários para manter sessão
const authPersistConfig = {
  key: "auth",
  storage,
  // Persiste user, isAuthenticated e tokens para manter sessão após refresh
  whitelist: [
    "user",
    "isAuthenticated",
    "token",
    "refreshToken",
    "tokenExpiresAt",
  ],
  blacklist: ["isLoading"],
};

// Combine reducers
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  theme: themeReducer,
  ui: uiReducer,
  user: userReducer,
  condominium: condominiumReducer,
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
    })
      .concat(authMiddleware) // Middleware de renovação automática de tokens
      .concat(authLoggingMiddleware), // Middleware de logging (apenas dev)
  devTools: import.meta.env.DEV,
});

// Create persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
