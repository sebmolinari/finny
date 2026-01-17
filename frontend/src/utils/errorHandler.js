import { toast } from "react-toastify";

/**
 * Handle API error responses with detailed validation errors
 * @param {Error} error - The error object from axios
 * @param {string} fallbackMessage - Default message if no specific error is available
 */
export const handleApiError = (
  error,
  fallbackMessage = "An error occurred",
) => {
  console.error("API Error:", error);

  const responseData = error.response?.data;

  // Check if there are detailed validation errors
  if (responseData?.errors && Array.isArray(responseData.errors)) {
    // Display each validation error
    responseData.errors.forEach((err) => {
      toast.error(`${err.field}: ${err.message}`);
    });
  } else {
    // Fallback to generic message
    toast.error(responseData?.message || fallbackMessage);
  }
};
