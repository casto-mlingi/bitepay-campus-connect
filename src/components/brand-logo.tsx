import logo from "@/assets/bitepay-logo.jpg.asset.json";

export function BrandLogo({ className = "w-8 h-8" }: { className?: string }) {
  return <img src={logo.url} alt="BitePay" className={`${className} rounded-lg object-cover shrink-0`} />;
}
