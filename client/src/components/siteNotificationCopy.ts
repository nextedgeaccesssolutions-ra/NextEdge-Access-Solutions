export const quoteNotificationCopy = {
  success: {
    tone: "success" as const,
    title: "Enquiry received",
    message: "The NEAS team will review your project details and contact you shortly.",
  },
  error: {
    tone: "error" as const,
    title: "Could not send enquiry",
    message: "Please check your details and try again, or contact the NEAS office directly.",
  },
};
