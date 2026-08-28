import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
}

interface NotificationsState {
  items: AppNotification[];
}

const initialState: NotificationsState = {
  items: [
    {
      id: "n1",
      title: "New demo request",
      body: "Sunrise Multispeciality Clinic requested a product demo.",
      time: "2 min ago",
      type: "info",
      read: false,
    },
    {
      id: "n2",
      title: "Trial expiring",
      body: "Lotus Dental Care trial ends in 3 days.",
      time: "1 hour ago",
      type: "warning",
      read: false,
    },
    {
      id: "n3",
      title: "Payment received",
      body: "CityCare Group paid INR 24,000 for the Professional plan.",
      time: "Yesterday",
      type: "success",
      read: true,
    },
    {
      id: "n4",
      title: "Low stock alert",
      body: "Amoxicillin 500mg is below the reorder level at Branch 2.",
      time: "Yesterday",
      type: "error",
      read: true,
    },
  ],
};

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    markRead(state, action: PayloadAction<string>) {
      const item = state.items.find((i) => i.id === action.payload);
      if (item) item.read = true;
    },
    markAllRead(state) {
      state.items.forEach((i) => {
        i.read = true;
      });
    },
    push(state, action: PayloadAction<AppNotification>) {
      state.items.unshift(action.payload);
    },
  },
});

export const { markRead, markAllRead, push } = notificationsSlice.actions;
export default notificationsSlice.reducer;
