import { ApiRouteConfig } from "motia";

// step-1
export const config: ApiRouteConfig = {
  name: "SubmitChannel",
  type: "api",
  path: "/submit",
  method: "POST",
  emits: ["yt.submit"],
};

interface SubmitRequest {
  channel: string;
  email: string;
}

export const handler = async (req: any, { emit, logger, state }: any) => {
  try {
    logger.info("Received submission request", { body: req.body });
    const { channel, email } = req.body as SubmitRequest;

    if (!channel || !email) {
      return {
        status: 400,
        body: {
          error: "Missing required fields",
        },
      };
    }

    //validate
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return {
        status: 400,
        body: {
          error: "Invalid email address",
        },
      };
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    await state.set(`job: ${jobId}`, {
      jobId,
      channel,
      email,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    logger.info(`Job created ${jobId}, ${channel}, ${email}`);

    await emit({
      topic: "yt.submit",
      data: {
        jobId,
        channel,
        email,
      },
    });

    return {
      status: 202,
      body: {
        success: true,
        jobId,
        message: "Job submitted successfully and Request has been queued.",
      },
    };
  } catch (error: any) {
    logger.error("Error in Submit Handler", { error: error.message });
    return {
      status: 500,
      body: {
        error: "Internal Server Error",
      },
    };
  }
};
