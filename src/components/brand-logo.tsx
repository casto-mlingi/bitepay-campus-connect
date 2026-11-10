import whiteLogo from "@/assets/bitepay-logo-white.png";
import orangeLogo from "@/assets/bitepay-logo-orange.png";

export function BrandLogo({ className = "w-8 h-8", variant = "standard" }: { className?: string; variant?: "standard" | "on-orange" }) {
  return <img src={variant === "on-orange" ? orangeLogo : whiteLogo} alt="BitePay" width={64} height={64} className={`rounded-lg object-contain shrink-0 ${className}`} />;
}
