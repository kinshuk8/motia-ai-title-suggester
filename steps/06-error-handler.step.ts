import { EventConfig } from "motia";
import { sendErrorNotification } from "../components/error/error-notifier";

// step-6
// Centralized error handler that uses the error-notifier component to send notifications

// @ts-ignore
export const config: EventConfig = {
  name: "ErrorHandler", // Renamed to ErrorHandler
  type: "event",
  subscribes: ["yt.channel.error", "yt.videos.error", "yt.titles.error"],
  emits: ["yt.error.notified"],
};

export const handler = async (eventData: any, { emit, logger, state }: any) => {
  const data = eventData || {};
  const jobId = data.jobId;
  const email = data.email;
  // The 'error' from eventData might be a string or an object with a message property
  const errorMessage =
    data.error?.message || data.error || "An unknown error occurred.";

  if (!jobId || !email) {
    logger.error(
      "Cannot handle error notification - missing jobId or email in event data",
      { eventData },
    );
    return;
  }

  try {
    await sendErrorNotification({
      jobId,
      email,
      errorMessage,
      state,
      emit,
    });
  } catch (componentError: any) {
    // This catch block handles errors *within* sendErrorNotification itself if it throws
    logger.error("Failed to execute sendErrorNotification component", {
      jobId,
      email,
      originalError: errorMessage,
      componentError: componentError?.message || "Unknown component error",
    });

    // Ensure the job state is marked as failed even if the notification component completely fails
    const jobData = await state.get(`job: ${jobId}`);
    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "failed",
      error: errorMessage,
      notificationError:
        componentError?.message ||
        "Failed to call error notification component",
      failedAt: new Date().toISOString(),
    });
  }
};
