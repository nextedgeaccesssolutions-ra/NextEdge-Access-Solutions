import { AlertCircle, CheckCircle2, X } from "lucide-react";

type SiteNotificationProps = {
  tone: "success" | "error";
  title: string;
  message: string;
  onDismiss: () => void;
};

export function SiteNotification({ tone, title, message, onDismiss }: SiteNotificationProps) {
  const isSuccess = tone === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className={`fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-md items-start gap-3 rounded-xl border p-4 shadow-[0_18px_50px_rgba(8,35,43,.22)] ${
        isSuccess
          ? "border-[#b6ef3c] bg-[#f5fbe9] text-[#173b3f]"
          : "border-[#f0b5a9] bg-[#fff5f2] text-[#6f2c23]"
      }`}
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
    >
      <Icon aria-hidden="true" className={`mt-0.5 shrink-0 ${isSuccess ? "text-[#6b9631]" : "text-[#b64f3d]"}`} size={20} />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-5 opacity-85">{message}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-black/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current"
        aria-label="Dismiss notification"
      >
        <X aria-hidden="true" size={17} />
      </button>
    </div>
  );
}
