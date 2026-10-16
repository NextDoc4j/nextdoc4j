import { h } from "vue";
import type { App } from "vue";
import Theme from "vitepress/theme";
import "./custom.css";
import "photoswipe/style.css";

import TeamMembers from "./components/TeamMembers.vue";
import SponsorSection from "./components/SponsorSection.vue";
import CommunityPlatforms from "./components/CommunityPlatforms.vue";
import HomePage from "./components/HomePage.vue";
import GuideOverview from "./components/GuideOverview.vue";
import GuideHeaderStrip from "./components/GuideHeaderStrip.vue";
import GuideInspirationCards from "./components/GuideInspirationCards.vue";
import GuideFeatureCards from "./components/GuideFeatureCards.vue";
import GuideArchCards from "./components/GuideArchCards.vue";
import GuidePreviewWindow from "./components/GuidePreviewWindow.vue";
import GuideCommunitySection from "./components/GuideCommunitySection.vue";
import GuideLicenseSection from "./components/GuideLicenseSection.vue";
import StartedNoticeCard from "./components/StartedNoticeCard.vue";
import StartedMavenTerminal from "./components/StartedMavenTerminal.vue";
import StartedConfigTerminal from "./components/StartedConfigTerminal.vue";
import StartedAccessCard from "./components/StartedAccessCard.vue";
import StartedGatewaySection from "./components/StartedGatewaySection.vue";
import StartedControllerTerminal from "./components/StartedControllerTerminal.vue";
import StartedFaqAccordion from "./components/StartedFaqAccordion.vue";
import ConfigBasicTerminal from "./components/ConfigBasicTerminal.vue";
import ConfigBasicDeepDive from "./components/ConfigBasicDeepDive.vue";
import ConfigEnvMatrix from "./components/ConfigEnvMatrix.vue";
import ConfigBasicFaq from "./components/ConfigBasicFaq.vue";
import ConfigBrandTerminal from "./components/ConfigBrandTerminal.vue";
import ConfigBrandPriority from "./components/ConfigBrandPriority.vue";
import ConfigAuthTerminal from "./components/ConfigAuthTerminal.vue";
import ConfigAuthLifecycle from "./components/ConfigAuthLifecycle.vue";
import ConfigMarkdownTerminal from "./components/ConfigMarkdownTerminal.vue";
import ConfigMarkdownCallout from "./components/ConfigMarkdownCallout.vue";
import UiShowcaseBox from "./components/UiShowcaseBox.vue";
import UiOverviewGrid from "./components/UiOverviewGrid.vue";
import UiBrowseCards from "./components/UiBrowseCards.vue";
import UiSecurityCards from "./components/UiSecurityCards.vue";
import UiSearchCards from "./components/UiSearchCards.vue";
import PluginEnumCards from "./components/PluginEnumCards.vue";
import PluginEnumTerminal from "./components/PluginEnumTerminal.vue";
import PluginAuthCards from "./components/PluginAuthCards.vue";
import PluginAuthTerminal from "./components/PluginAuthTerminal.vue";
import PluginSatokenTerminal from "./components/PluginSatokenTerminal.vue";
import ConfigBrandCards from "./components/ConfigBrandCards.vue";
import ChangelogTimeline from "./components/ChangelogTimeline.vue";
import ContributeSpecs from "./components/ContributeSpecs.vue";
import ContributeWorkflow from "./components/ContributeWorkflow.vue";
import JoinGroupShowcase from "./components/JoinGroupShowcase.vue";
import MoreFaqAccordion from "./components/MoreFaqAccordion.vue";
import MorePlatformCards from "./components/MorePlatformCards.vue";
import MoreTeamShowcase from "./components/MoreTeamShowcase.vue";

let removeImageClickListener: (() => void) | null = null;

const getVisibleImages = () => {
  if (typeof window === "undefined") {
    return [] as HTMLImageElement[];
  }
  return Array.from(
    document.querySelectorAll<HTMLImageElement>(".vp-doc img:not(.no-zoom)")
  ).filter((img) => img.offsetParent !== null);
};

const getImageSize = (img: HTMLImageElement) => {
  const width =
    img.naturalWidth ||
    Number(img.getAttribute("width")) ||
    Math.max(img.clientWidth, 800);
  const height =
    img.naturalHeight ||
    Number(img.getAttribute("height")) ||
    Math.max(img.clientHeight, 600);
  return { width, height };
};

const openPhotoSwipe = async (targetImg: HTMLImageElement) => {
  const images = getVisibleImages();
  const index = images.findIndex((img) => img === targetImg);
  if (index < 0) {
    return;
  }

  const dataSource = images.map((img) => {
    const { width, height } = getImageSize(img);
    return {
      src: img.currentSrc || img.src,
      width,
      height,
      alt: img.alt || "",
    };
  });

  const { default: PhotoSwipe } = await import("photoswipe");
  const pswp = new PhotoSwipe({
    dataSource,
    index,
    showHideAnimationType: "zoom",
    bgOpacity: 0.92,
    wheelToZoom: true,
    pinchToClose: true,
    closeOnVerticalDrag: true,
    maxZoomLevel: 4,
  } as any);
  pswp.init();
};

const installImageClickListener = () => {
  if (typeof window === "undefined") {
    return;
  }

  removeImageClickListener?.();

  const onClick = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target) {
      return;
    }

    const img = target.closest(".vp-doc img:not(.no-zoom)") as HTMLImageElement | null;
    if (!img || img.offsetParent === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    void openPhotoSwipe(img);
  };

  document.addEventListener("click", onClick, true);
  removeImageClickListener = () => {
    document.removeEventListener("click", onClick, true);
  };
};

export default {
  ...Theme,
  Layout: () => {
    return h(Theme.Layout, null, {});
  },
  enhanceApp({ app, router }: { app: App; router: any }) {
    app.component("TeamMembers", TeamMembers);
    app.component("SponsorSection", SponsorSection);
    app.component("CommunityPlatforms", CommunityPlatforms);
    app.component("HomePage", HomePage);
    app.component("GuideOverview", GuideOverview);
    app.component("GuideHeaderStrip", GuideHeaderStrip);
    app.component("GuideInspirationCards", GuideInspirationCards);
    app.component("GuideFeatureCards", GuideFeatureCards);
    app.component("GuideArchCards", GuideArchCards);
    app.component("GuidePreviewWindow", GuidePreviewWindow);
    app.component("GuideCommunitySection", GuideCommunitySection);
    app.component("GuideLicenseSection", GuideLicenseSection);
    app.component("StartedNoticeCard", StartedNoticeCard);
    app.component("StartedMavenTerminal", StartedMavenTerminal);
    app.component("StartedConfigTerminal", StartedConfigTerminal);
    app.component("StartedAccessCard", StartedAccessCard);
    app.component("StartedGatewaySection", StartedGatewaySection);
    app.component("StartedControllerTerminal", StartedControllerTerminal);
    app.component("StartedFaqAccordion", StartedFaqAccordion);
    app.component("ConfigBasicTerminal", ConfigBasicTerminal);
    app.component("ConfigBasicDeepDive", ConfigBasicDeepDive);
    app.component("ConfigEnvMatrix", ConfigEnvMatrix);
    app.component("ConfigBasicFaq", ConfigBasicFaq);
    app.component("ConfigBrandTerminal", ConfigBrandTerminal);
    app.component("ConfigBrandPriority", ConfigBrandPriority);
    app.component("ConfigAuthTerminal", ConfigAuthTerminal);
    app.component("ConfigAuthLifecycle", ConfigAuthLifecycle);
    app.component("ConfigMarkdownTerminal", ConfigMarkdownTerminal);
    app.component("ConfigMarkdownCallout", ConfigMarkdownCallout);
    app.component("UiShowcaseBox", UiShowcaseBox);
    app.component("UiOverviewGrid", UiOverviewGrid);
    app.component("UiBrowseCards", UiBrowseCards);
    app.component("UiSecurityCards", UiSecurityCards);
    app.component("UiSearchCards", UiSearchCards);
    app.component("PluginEnumCards", PluginEnumCards);
    app.component("PluginEnumTerminal", PluginEnumTerminal);
    app.component("PluginAuthCards", PluginAuthCards);
    app.component("PluginAuthTerminal", PluginAuthTerminal);
    app.component("PluginSatokenTerminal", PluginSatokenTerminal);
    app.component("ConfigBrandCards", ConfigBrandCards);
    app.component("ChangelogTimeline", ChangelogTimeline);
    app.component("ContributeSpecs", ContributeSpecs);
    app.component("ContributeWorkflow", ContributeWorkflow);
    app.component("JoinGroupShowcase", JoinGroupShowcase);
    app.component("MoreFaqAccordion", MoreFaqAccordion);
    app.component("MorePlatformCards", MorePlatformCards);
    app.component("MoreTeamShowcase", MoreTeamShowcase);
    installImageClickListener();
    router?.onAfterRouteChanged?.(() => {
      installImageClickListener();
    });
  },
};
