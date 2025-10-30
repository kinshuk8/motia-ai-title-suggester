import { EventConfig } from "motia";

// step-4
// uses GEMINI API to generate improved video titles

// @ts-ignore
export const config: EventConfig = {
  name: "GenerateTitles",
  type: "event",
  subscribes: ["yt.videos.fetched"],
  emits: ["yt.titles.ready", "yt.titles.error"],
};

interface Video {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  thumbnail?: string;
}

interface ImprovedTitle {
  original: string;
  improved: string;
  rationale: string;
  url: string;
}

export const handler = async (eventData: any, { emit, logger, state }: any) => {
  let jobId: string | undefined;
  let email: string | undefined;

  try {
    const data = eventData || {};
    jobId = data.jobId;
    email = data.email;
    const channelName = data.channelName;
    const videos = data.videos;

    logger.info("Resolving youtube chanel", {
      jobId,
      videoLength: videos.length,
    });

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY");
    }

    const jobData = await state.get(`job: ${jobId}`);

    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "generating titles",
    });

    const videoTitles = videos
      .map((v: Video, idx: number) => `${idx + 1}. "${v.title}"`)
      .join("\n");

    const prompt = `You are a YouTube title optimization expert. Below are ${videos.length} video titles from channel "${channelName}".
      For each title, provide:
      1. An improved version that is more engaging, SEO friendly and likely to get more clicks.
      2. A brief rationale (1-2 sentences) explaining why the improved title is better

      Guidelines:
      - Keep the core topic and authenticity
      - Use action verbs, numbers and specific value prepositions
      - Make it curiosity-inducing without being clickbait
      - Optimize for searchability and clarity

      Video Titles:
      ${videoTitles}

      Respond in JSON Format:
      {
        "titles": [
          {
            "original": "...",
            "improved": "...",
            "rationale": "...",
          }
        ]
      }`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini API Error: ${errorData.error?.message || "Unknown AI Error"}`,
      );
    }

    const aiResponse = await response.json();
    const aiContent = aiResponse.candidates[0].content.parts[0].text;
    const parsedResponse = JSON.parse(aiContent);

    const improvedTitles: ImprovedTitle[] = parsedResponse.titles.map(
      (title: any, idx: number) => ({
        original: title.original,
        improved: title.improved,
        rationale: title.rationale,
        url: videos[idx].url,
      }),
    );
    logger.info(`Generated ${improvedTitles.length} improved titles`);

    await state.set(`job: ${jobId}`, {
      ...jobData,
      status: "titles ready",
      improvedTitles,
    });

    await emit({
      topic: "yt.titles.ready",
      data: {
        jobId,
        channelName,
        email,
        improvedTitles,
      },
    });
  } catch (error: any) {
    logger.error("Error generating titles", { error: error.message });

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
      topic: "yt.titles.error",
      data: {
        jobId,
        email,
        error:
          "failed to fetch improved titles for the video, please try again later",
      },
    });
  }
};
