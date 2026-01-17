"use client";

import { useEffect, useRef, useState } from "react";
import { sankey, sankeyLinkHorizontal, sankeyCenter, SankeyNode, SankeyLink } from "d3-sankey";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeftRight } from "lucide-react";

// Types for our data structure
interface NodeData {
  id: string;
  label: string;
  type: "account" | "source" | "sink";
}

interface LinkData {
  source: string;
  target: string;
  value: number;
}

interface SankeyDataInput {
  nodes: NodeData[];
  links: LinkData[];
}

// Extended types for d3-sankey processed data
type ProcessedNode = SankeyNode<NodeData, LinkData> & NodeData;
type ProcessedLink = SankeyLink<NodeData, LinkData> & {
  source: ProcessedNode;
  target: ProcessedNode;
};

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
  subContent?: string;
}

// Hardcoded sample data
const SAMPLE_DATA: SankeyDataInput = {
  nodes: [
    { id: "acct", label: "Maybank Account", type: "account" },
    { id: "in_remittance", label: "Remittance", type: "source" },
    { id: "in_personal", label: "Personal Transfers", type: "source" },
    { id: "cat_transfers", label: "Transfers / Exchange", type: "sink" },
    { id: "cat_housing", label: "Housing", type: "sink" },
    { id: "cat_subscriptions", label: "Subscriptions", type: "sink" },
    { id: "cat_daily", label: "Daily Living", type: "sink" },
  ],
  links: [
    { source: "in_remittance", target: "acct", value: 6522 },
    { source: "in_personal", target: "acct", value: 3305 },
    { source: "acct", target: "cat_transfers", value: 2600.18 },
    { source: "acct", target: "cat_housing", value: 4195 },
    { source: "acct", target: "cat_subscriptions", value: 26.62 },
    { source: "acct", target: "cat_daily", value: 1589.15 },
  ],
};

// Color palette by node type
const NODE_COLORS: Record<string, string> = {
  source: "#10b981", // Emerald green for income
  account: "#3b82f6", // Blue for account
  sink: "#f97316", // Orange for expenses
};

const NODE_COLORS_LIGHT: Record<string, string> = {
  source: "#d1fae5",
  account: "#dbeafe",
  sink: "#ffedd5",
};

interface SankeyDiagramProps {
  data?: SankeyDataInput;
  width?: number;
  height?: number;
}

export function SankeyDiagram({
  data = SAMPLE_DATA,
  width: propWidth,
  height: propHeight = 500,
}: SankeyDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: propWidth || 800, height: propHeight });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: "",
  });

  // Handle responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    if (propWidth) {
      setDimensions((prev) => ({ ...prev, width: propWidth }));
      return;
    }

    const updateWidth = () => {
      if (containerRef.current) {
        const { width } = containerRef.current.getBoundingClientRect();
        setDimensions((prev) => ({ ...prev, width: Math.max(width, 400) }));
      }
    };

    // Initial measurement
    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [propWidth]);

  // Process data and create sankey layout
  const { nodes, links } = (() => {
    const nodeMap = new Map(data.nodes.map((n, i) => [n.id, i]));

    const sankeyGenerator = sankey<NodeData, LinkData>()
      .nodeId((d) => d.id)
      .nodeWidth(20)
      .nodePadding(32)
      .nodeAlign(sankeyCenter)
      .extent([
        [120, 20],
        [dimensions.width - 140, dimensions.height - 20],
      ]);

    const sankeyData = sankeyGenerator({
      nodes: data.nodes.map((d) => ({ ...d })),
      links: data.links.map((d) => ({ ...d })),
    });

    return {
      nodes: sankeyData.nodes as ProcessedNode[],
      links: sankeyData.links as ProcessedLink[],
    };
  })();

  // Format currency
  const formatValue = (value: number) => {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency: "MYR",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Calculate node total (in or out)
  const getNodeTotal = (node: ProcessedNode) => {
    const incoming = links
      .filter((l) => l.target.id === node.id)
      .reduce((sum, l) => sum + l.value, 0);
    const outgoing = links
      .filter((l) => l.source.id === node.id)
      .reduce((sum, l) => sum + l.value, 0);
    return node.type === "source" ? outgoing : node.type === "sink" ? incoming : Math.max(incoming, outgoing);
  };

  // Check if a link is connected to hovered node
  const isLinkConnected = (link: ProcessedLink) => {
    if (!hoveredNode) return true;
    return link.source.id === hoveredNode || link.target.id === hoveredNode;
  };

  // Check if a node is connected to hovered node
  const isNodeConnected = (node: ProcessedNode) => {
    if (!hoveredNode) return true;
    if (node.id === hoveredNode) return true;
    return links.some(
      (l) =>
        (l.source.id === hoveredNode && l.target.id === node.id) ||
        (l.target.id === hoveredNode && l.source.id === node.id)
    );
  };

  // Handle node hover
  const handleNodeHover = (node: ProcessedNode | null, event?: React.MouseEvent) => {
    if (node && event) {
      setHoveredNode(node.id);
      const total = getNodeTotal(node);
      setTooltip({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        content: node.label,
        subContent: `Total: ${formatValue(total)}`,
      });
    } else {
      setHoveredNode(null);
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  // Handle link hover
  const handleLinkHover = (link: ProcessedLink | null, index: number | null, event?: React.MouseEvent) => {
    if (link && event && index !== null) {
      setHoveredLink(index);
      setTooltip({
        visible: true,
        x: event.clientX,
        y: event.clientY,
        content: `${link.source.label} → ${link.target.label}`,
        subContent: formatValue(link.value),
      });
    } else {
      setHoveredLink(null);
      setTooltip((prev) => ({ ...prev, visible: false }));
    }
  };

  // Generate gradient ID for link
  const getLinkGradientId = (index: number) => `link-gradient-${index}`;

  return (
    <Card className="w-full border shadow-lg bg-background">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-lg font-semibold">Cash Flow</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <div ref={containerRef} className="relative w-full">
          {/* Tooltip */}
          {tooltip.visible && (
            <div
              className="pointer-events-none fixed z-50 rounded-lg border border-border bg-popover px-3 py-2 shadow-xl transition-opacity duration-150"
              style={{
                left: tooltip.x + 12,
                top: tooltip.y - 12,
                transform: "translateY(-100%)",
              }}
            >
              <div className="text-sm font-medium text-popover-foreground">{tooltip.content}</div>
              {tooltip.subContent && (
                <div className="text-sm font-semibold text-primary">{tooltip.subContent}</div>
              )}
            </div>
          )}

          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            className="overflow-visible"
          >
            {/* Gradient definitions for links */}
            <defs>
              {links.map((link, i) => (
                <linearGradient
                  key={getLinkGradientId(i)}
                  id={getLinkGradientId(i)}
                  gradientUnits="userSpaceOnUse"
                  x1={link.source.x1}
                  x2={link.target.x0}
                >
                  <stop offset="0%" stopColor={NODE_COLORS[link.source.type]} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={NODE_COLORS[link.target.type]} stopOpacity={0.5} />
                </linearGradient>
              ))}
              {/* Drop shadow filter */}
              <filter id="node-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.15" />
              </filter>
            </defs>

            {/* Links */}
            <g className="links">
              {links.map((link, i) => {
                const path = sankeyLinkHorizontal()(link);
                const isHovered = hoveredLink === i;
                const isConnected = isLinkConnected(link);
                const opacity = hoveredNode || hoveredLink !== null
                  ? isHovered
                    ? 0.8
                    : isConnected
                    ? 0.4
                    : 0.1
                  : 0.4;

                return (
                  <path
                    key={i}
                    d={path || ""}
                    fill="none"
                    stroke={`url(#${getLinkGradientId(i)})`}
                    strokeWidth={Math.max(link.width || 1, 2)}
                    strokeOpacity={opacity}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={(e) => handleLinkHover(link, i, e)}
                    onMouseMove={(e) =>
                      setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }))
                    }
                    onMouseLeave={() => handleLinkHover(null, null)}
                    style={{
                      strokeWidth: isHovered ? (link.width || 1) + 4 : link.width || 1,
                    }}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g className="nodes">
              {nodes.map((node) => {
                const isHovered = hoveredNode === node.id;
                const isConnected = isNodeConnected(node);
                const opacity = hoveredNode ? (isConnected ? 1 : 0.3) : 1;
                const nodeHeight = (node.y1 || 0) - (node.y0 || 0);

                return (
                  <g
                    key={node.id}
                    className="cursor-pointer transition-all duration-200"
                    style={{ opacity }}
                    onMouseEnter={(e) => handleNodeHover(node, e)}
                    onMouseMove={(e) =>
                      setTooltip((prev) => ({ ...prev, x: e.clientX, y: e.clientY }))
                    }
                    onMouseLeave={() => handleNodeHover(null)}
                  >
                    {/* Node rectangle */}
                    <rect
                      x={node.x0}
                      y={node.y0}
                      width={(node.x1 || 0) - (node.x0 || 0)}
                      height={nodeHeight}
                      fill={NODE_COLORS[node.type]}
                      rx={4}
                      ry={4}
                      filter="url(#node-shadow)"
                      className="transition-all duration-200"
                      style={{
                        transform: isHovered ? "scale(1.05)" : "scale(1)",
                        transformOrigin: `${(node.x0 || 0) + 12}px ${(node.y0 || 0) + nodeHeight / 2}px`,
                      }}
                    />

                    {/* Node label */}
                    <text
                      x={
                        node.type === "source"
                          ? (node.x0 || 0) - 8
                          : node.type === "sink"
                          ? (node.x1 || 0) + 8
                          : ((node.x0 || 0) + (node.x1 || 0)) / 2
                      }
                      y={(node.y0 || 0) + nodeHeight / 2}
                      dy="0.35em"
                      textAnchor={
                        node.type === "source" ? "end" : node.type === "sink" ? "start" : "middle"
                      }
                      className="pointer-events-none select-none fill-foreground text-sm font-medium"
                      style={{
                        fontSize: "13px",
                        fontWeight: isHovered ? 600 : 500,
                      }}
                    >
                      {node.label}
                    </text>

                    {/* Value label below node name */}
                    <text
                      x={
                        node.type === "source"
                          ? (node.x0 || 0) - 8
                          : node.type === "sink"
                          ? (node.x1 || 0) + 8
                          : ((node.x0 || 0) + (node.x1 || 0)) / 2
                      }
                      y={(node.y0 || 0) + nodeHeight / 2 + 16}
                      dy="0.35em"
                      textAnchor={
                        node.type === "source" ? "end" : node.type === "sink" ? "start" : "middle"
                      }
                      className="pointer-events-none select-none fill-muted-foreground text-xs"
                      style={{ fontSize: "11px" }}
                    >
                      {formatValue(getNodeTotal(node))}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: NODE_COLORS.source }}
              />
              <span className="text-muted-foreground">Income</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: NODE_COLORS.account }}
              />
              <span className="text-muted-foreground">Account</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-sm"
                style={{ backgroundColor: NODE_COLORS.sink }}
              />
              <span className="text-muted-foreground">Expenses</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default SankeyDiagram;