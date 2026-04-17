"use client";

import Calendar from "@/components/Calendar";
import { useGlobalFilter } from "@/context/GlobalFilterContext";

export default function CalendarClient() {
  const { filter } = useGlobalFilter();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 56px)",
        background: "#09090b",
      }}
    >
      <Calendar
        communityId={filter.communityId}
        divisionId={filter.divisionId}
      />
    </div>
  );
}
