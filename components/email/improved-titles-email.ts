interface ImprovedTitle {
  original: string;
  improved: string;
  rationale: string;
  url: string;
}

export function generateEmailHtml(
  channelName: string,
  titles: ImprovedTitle[],
): string {
  const titleBlocks = titles
    .map(
      (title, index) => `
    <div style=\"background-color: #fff; border: 1px solid #eee; border-radius: 4px; padding: 15px; margin-bottom: 15px;\">
        <p style=\"margin: 0 0 5px 0;\"><strong>Original:</strong> ${title.original}</p>
        <p style=\"margin: 0 0 5px 0;\"><strong>Improved:</strong> ${title.improved}</p>
        <p style=\"margin: 0 0 5px 0;\"><strong>Why:</strong> ${title.rationale}</p>
        <p style=\"margin: 0;\"><strong>Watch:</strong> <a href=\"${title.url}\" style=\"color: #0056b3; text-decoration: none;\">${title.url}</a></p>
    </div>
  `,
    )
    .join("\n");

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset=\"utf-8\">
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">
    <title>YouTube Title Doctor - Improved Titles</title>
    <style>
        body {
            font-family: Arial, sans-serif;\n            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 20px auto;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background-color: #f9f9f9;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            padding-bottom: 20px;
            border-bottom: 1px solid #eee;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #0056b3;
            margin: 0 0 10px 0;
        }
        .header p {
            color: #666;
            margin: 0;
        }
        .title-block {
            background-color: #fff;
            border: 1px solid #eee;
            border-radius: 4px;
            padding: 15px;
            margin-bottom: 15px;
        }
        .title-block strong {
            color: #0056b3;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #777;
            font-size: 0.9em;
        }
        a {
            color: #0056b3;
            text-decoration: none;
        }
        a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class=\"container\">
        <div class=\"header\">
            <h1>YouTube Title Doctor</h1>
            <p>Improved Titles for <strong>${channelName}</strong></p>
        </div>
        ${titleBlocks}
        <div class=\"footer\">
            <p>Powered by <a href=\"https://motia.dev\" target=\"_blank\">Motia.dev</a></p>
        </div>
    </div>
</body>
</html>
  `;
}

export function generateEmailTextFallback(
  channelName: string,
  titles: ImprovedTitle[],
): string {
  let text = `YouTube Title Doctor - Improved Titles for ${channelName}\n\n`;
  text += `============================================================\\n\\n`;

  titles.forEach((title, index) => {
    text += `Video ${index + 1}:\n`;
    text += `----------------------\n`;
    text += `Original: ${title.original}\n`;
    text += `Improved: ${title.improved}\n`;
    text += `Why: ${title.rationale}\n`;
    text += `Watch: ${title.url}\n\n`;
  });

  text += `============================================================\\n\\n`;
  text += `Powered by Motia.dev\n`;
  return text;
}
