import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getDefaultClassNames } from "react-day-picker";
import { Group, Separator } from "react-resizable-panels";
import { GitBranch } from "lucide-react";

import { Calendar } from "../client/src/components/ui/calendar";
import {
  ChartLegendContent,
  ChartTooltipContent,
} from "../client/src/components/ui/chart";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "../client/src/components/ui/resizable";
import GitHubConnector from "../client/src/pages/GitHubConnector";

describe("legacy client dependency compatibility", () => {
  it("uses the React DayPicker v10 month-grid class key", () => {
    expect(getDefaultClassNames().month_grid).toBeTruthy();

    const markup = renderToStaticMarkup(
      createElement(Calendar, { mode: "single" })
    );

    expect(markup).toContain('data-slot="calendar"');
  });

  it("preserves the resizable wrapper contract on react-resizable-panels v4", () => {
    expect(Group).toBeDefined();
    expect(Separator).toBeDefined();

    const markup = renderToStaticMarkup(
      createElement(
        ResizablePanelGroup,
        { direction: "horizontal" },
        createElement(ResizablePanel, { defaultSize: 50, minSize: 20 }, "Left"),
        createElement(ResizableHandle, { withHandle: true }),
        createElement(ResizablePanel, { defaultSize: 50, minSize: 20 }, "Right")
      )
    );

    expect(markup).toContain("data-group");
    expect(markup).toContain("data-panel");
    expect(markup).toContain("data-separator");
    expect(markup).toContain("50%");
  });

  it("loads the Recharts v3 wrappers and GitHub connector with current exports", () => {
    expect(ChartTooltipContent).toBeDefined();
    expect(ChartLegendContent).toBeDefined();
    expect(GitBranch).toBeDefined();
    expect(GitHubConnector).toBeDefined();
  });
});
