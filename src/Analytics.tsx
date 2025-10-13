import { onMount } from "solid-js";

const isProd = import.meta.env.MODE != "development";

export const Analytics = () => {
  onMount(() => {
    if (!isProd) return;

    const script = document.createElement("script");
    script.defer = true;
    script.src = "https://traffic.joinemm.dev/script.js";
    script.setAttribute(
      "data-website-id",
      "07a27c73-d582-4e27-976e-4b1e8edb9fa0",
    );
    document.head.appendChild(script);
  });

  return null; // This component doesn't render anything
};
