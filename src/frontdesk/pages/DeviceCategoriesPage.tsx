import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Tag } from "lucide-react";
import { DeviceCategoriesPanel } from "@/components/DeviceCategoriesPanel";
import { hasPrivilege } from "@/auth/privileges";

export default function DeviceCategoriesPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    setAllowed(hasPrivilege("privilege_lead_engineer_management"));
  }, []);

  if (allowed === null) return null;
  if (!allowed) return <Navigate to="/" replace />;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in space-y-6">


      <DeviceCategoriesPanel />
    </div>
  );
}
