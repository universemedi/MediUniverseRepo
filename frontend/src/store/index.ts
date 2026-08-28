import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux";
import auth from "./slices/authSlice";
import theme from "./slices/themeSlice";
import ui from "./slices/uiSlice";
import notifications from "./slices/notificationsSlice";
import tenant from "./slices/tenantSlice";

const rootReducer = combineReducers({ auth, theme, ui, notifications, tenant });

export const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore["dispatch"];

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
