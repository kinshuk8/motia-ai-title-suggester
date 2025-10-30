import { EventConfig } from "motia";

// step-3
// retrieves the latest 5 videos from the channel id

// @ts-ignore
export const config: EventConfig = {
  name: "FetchVideos",
  type: "event",
  subscribes: ["yt.channel.resolved"],
  emits: ["yt.videos.fetched", "yt.videos.error"],
};

interface Video {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnail?: string;
}

export const handler = async (eventData: any, { emit, logger, state }: any) => {
  let jobId: string | undefined;
  let email: string | undefined;

  try {
    const data = eventData || {};
    jobId = data.jobId;
    email = data.email;
    const channelId = data.channelId;
    const channelName = data.channelName;

    logger.info("Resolving youtube chanel", { jobId, channelId, channelName });

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
    if (!YOUTUBE_API_KEY) {
      throw new Error("Missing YOUTUBE_API_KEY");
    }

    const jobData = await state.get(`job: ${jobId}`);
    await state.set(`jobId: ${jobId}`, {
      ...jobData,
      status: "fetching videos",
    });

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`;

    const searchResponse = await fetch(searchUrl);
    const youtubeData = await searchResponse.json();

    if (!youtubeData.items || youtubeData.items.length === 0) {
      logger.warning("No videos for channel", {
        jobId,
        channelId,
        channelName,
      });

      await state.set(`job: ${jobId}`, {
        ...jobData,
        status: "failed",
        error: "No videos found",
      });

      await emit({
        topic: "yt.videos.error",
        data: {
          jobId,
          email,
          error: "No videos found for this channel",
        },
      });
      return;
    }

    const videos: Video[] = youtubeData.items.map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      publishedAt: item.snippet.publishedAt,
      thumbnail: item.snippet.thumbnails.default.url,
    }));

    logger.info("Videos fetched successfully", {
      jobId,
      videoCount: videos.length,
    });

    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "videos fetched",
      videos,
    });

    await emit({
      topic: "yt.videos.fetched",
      data: {
        jobId,
        channelName,
        videos,
        email,
      },
    });
    return;
  } catch (error: any) {
    logger.error("Error fetching videos", { error: error.message });

    if (!jobId || !email) {
      logger.error("Cannot send error notification - missing jobId or email");
      return;
    }

    const jobData = await state.get(`job: ${jobId}`);

    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "failed",
      error: error.message,
    });

    await emit({
      topic: "yt.videos.error",
      data: {
        jobId,
        email,
        error: "failed to fetch videos, please try again later",
      },
    });
  }
};
