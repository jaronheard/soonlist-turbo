import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const translateToHtml = (input: string): string => {
  let html = input;

  // Replace line breaks with <br>
  html = html.replace(/\[br\]/g, "<br />");

  // Replace paragraphs
  html = html.replace(/\[p\](.*?)\[\/p\]/g, "<p>$1</p>");

  // Replace strong tags
  html = html.replace(/\[strong\](.*?)\[\/strong\]/g, "<strong>$1</strong>");

  // Replace underline
  html = html.replace(/\[u\](.*?)\[\/u\]/g, "<u>$1</u>");

  // Replace italic and emphasis
  html = html.replace(/\[(i|em)\](.*?)\[\/(i|em)\]/g, "<i>$2</i>");

  // Replace unordered and ordered lists
  html = html.replace(/\[ul\](.*?)\[\/ul\]/gs, "<ul>$1</ul>");
  html = html.replace(/\[ol\](.*?)\[\/ol\]/gs, "<ol>$1</ol>");
  html = html.replace(/\[li\](.*?)\[\/li\]/g, "<li>$1</li>");

  // Replace headers h1, h2, h3, ...
  html = html.replace(/\[h(\d)\](.*?)\[\/h\1\]/g, "<h$1>$2</h$1>");

  // Replace [hr] with <hr />
  html = html.replace(/\[hr\]/g, "<hr />");

  // Replace URLs with rel="noopener noreferrer" for security and style="text-decoration: underline;" for underline
  html = html.replace(
    /\[url\](.*?)\|(.*?)\[\/url\]/g,
    (match, url: string, text) => {
      if (!/^https?:\/\//i.test(url)) {
        url = "http://" + url;
      }
      return (
        '<a href="' +
        url +
        '" rel="noopener noreferrer" target="_blank" style="text-decoration: underline;">' +
        text +
        "</a>"
      );
    },
  );
  html = html.replace(/\[url\](.*?)\[\/url\]/g, (match, url: string) => {
    if (!/^https?:\/\//i.test(url)) {
      url = "http://" + url;
    }
    return (
      '<a href="' +
      url +
      '" target="_blank" rel="noopener noreferrer" style="text-decoration: underline;">' +
      url +
      "</a>"
    );
  });

  return html;
};

export type Status = "idle" | "submitting" | "success" | "error";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function extractFilePath(url: string) {
  const match = url.match(/\/uploads\/\d{4}\/\d{2}\/\d{2}\/[^?]+/);
  return match ? match[0] : "";
}

export function valueToOption(value: string): { value: string; label: string } {
  return { value, label: value };
}

export function valuesToOptions(
  values: readonly string[],
): { value: string; label: string }[] {
  return values.map((value) => valueToOption(value));
}

export function optionsToValues(options: { value: string; label: string }[]) {
  return options.map((option) => option.value);
}
