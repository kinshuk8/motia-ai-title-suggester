export async function sendErrorNotification({
  jobId,
  email,
  errorMessage,
  state, // Motia state object
  emit, // Motia emit function
}: {
  jobId: string;
  email: string;
  errorMessage: string;
  state: any;
  emit: any;
}) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const RESEND_FROM_EMAIL =
    process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  if (!RESEND_API_KEY) {
    // Update job state to failed even if email cannot be sent
    const jobData = await state.get(`job: ${jobId}`);
    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "failed",
      error:
        errorMessage || "RESEND_API_KEY missing, error notification failed",
    });
    return;
  }

  const emailText = `Dear user,

We regret to inform you that an error occurred while processing your request (Job ID: ${jobId}).
The details of the error are:
"${errorMessage}"

Please try submitting your request again later. If the issue persists, please contact support.

Thank you for using YouTube Title Doctor.
Powered by Motia.dev`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: email,
        subject: `[Error] Your YouTube Title Doctor Request Failed (Job ID: ${jobId})`,
        text: emailText,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Resend API Error: ${errorData.error?.message || "Unknown error details for error notification"}` ||
          `Unknown Email Error for error notification`,
      );
    }

    const emailResult = await response.json();

    // Update job state to failed after sending notification
    const jobData = await state.get(`job: ${jobId}`);
    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "failed",
      error: errorMessage, // Original error message
      notificationEmailId: emailResult.id,
      failedAt: new Date().toISOString(),
    });

    await emit({
      topic: "yt.error.notified",
      data: {
        jobId,
        email,
        error: errorMessage,
        emailId: emailResult.id,
      },
    });
  } catch (notificationError: any) {
    // Ensure job status is still marked as failed even if notification fails
    const jobData = await state.get(`job: ${jobId}`);
    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "failed",
      error: errorMessage, // Original error message
      notificationError:
        notificationError?.message || "Failed to send error notification email",
      failedAt: new Date().toISOString(),
    });
  }
}
