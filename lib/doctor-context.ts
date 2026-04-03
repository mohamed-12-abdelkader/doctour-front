export type BasicRole = "admin" | "doctor" | "secretary" | "staff" | string;

function getStoredUserRaw(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentRole(): BasicRole | null {
  const user = getStoredUserRaw();
  return user?.role ?? user?.user?.role ?? null;
}

export function getCurrentDoctorId(): number | null {
  if (typeof window === "undefined") return null;

  const selectedRaw = localStorage.getItem("selectedDoctorId");
  if (selectedRaw) {
    const selected = Number(selectedRaw);
    if (!Number.isNaN(selected) && selected > 0) return selected;
  }

  const user = getStoredUserRaw();
  const fromProfile = user?.doctorProfile?.id ?? user?.user?.doctorProfile?.id;
  const fromDoctorId = user?.doctorId ?? user?.user?.doctorId;

  const id = Number(fromProfile ?? fromDoctorId);
  return Number.isNaN(id) || id <= 0 ? null : id;
}

export function setSelectedDoctorId(doctorId: number | null) {
  if (typeof window === "undefined") return;
  if (!doctorId) {
    localStorage.removeItem("selectedDoctorId");
    return;
  }
  localStorage.setItem("selectedDoctorId", String(doctorId));
}

export function canChooseDoctor(role: BasicRole | null) {
  return role === "admin" || role === "secretary" || role === "staff";
}
