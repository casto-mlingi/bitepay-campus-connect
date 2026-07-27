import { ShieldAlert } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function AccessDenied({ feature }: { feature?: string }) {
  return (
    <div className="max-w-lg mx-auto mt-16 bg-surface border rounded-2xl p-8 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 grid place-items-center text-amber-700 mb-4">
        <ShieldAlert className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold">You don't have access to this area</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        {feature ? `"${feature}" is limited to higher-permission roles.` : "This section is limited to higher-permission roles."} Ask your store manager to grant you access.
      </p>
      <Link to="/staff" className="inline-block mt-6 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2 rounded-lg">Back to Live Orders</Link>
    </div>
  );
}
