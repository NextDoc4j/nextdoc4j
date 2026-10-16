package top.nextdoc4j.demo.controller.user.test;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * 报表设计 DSL 演示：用于测试 springdoc-openapi 对深层嵌套 / 自引用递归结构的处理能力。
 *
 * <p>整体结构对应"工作簿 -> 多个 Sheet -> 每个 Sheet 若干 Region -> Region 可以嵌套子 Region（递归）
 * -> 每个 Region 下挂各类渲染规则（单元格/汇总/图片/富文本/公式/样式/条件格式/超链接/批注）"。
 *
 * <p>字段区分规则：JSON 示例里枚举类字段给出的是一个真实取值（如 "VISIBLE"、"STATIC_COPY"），
 * 这些做成了真正的 Java enum；自由字符串/数值字段给出的是占位符 "string"/1/false，
 * 这些保留为 String/Integer/Object。枚举里除示例给出的那个取值外，其余取值为方便演示
 * 补充的常见候选项，不代表真实业务约束，接入真实系统时请按实际取值调整。
 */
@Tag(name = "报表设计DSL演示")
@RestController
@RequestMapping("/design/reports")
public class ReportDesignDemoController {

    @Operation(summary = "生成报表", description = "接收报表设计 DSL（深层嵌套 + 递归 Region 结构），演示 springdoc 对复杂 schema 的处理")
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "解析成功，返回报表生成结果",
            content = @Content(
                mediaType = MediaType.APPLICATION_JSON_VALUE,
                schema = @Schema(implementation = ReportGenerateResp.class)
            )
        )
    })
    @PostMapping(value = "/generate", consumes = MediaType.APPLICATION_JSON_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ReportGenerateResp> generateReport(@RequestBody ReportGenerateReq request) {
        List<SheetConfig> sheets = request.outputConfig() == null || request.outputConfig().sheets() == null
            ? List.of() : request.outputConfig().sheets();
        int sheetCount = sheets.size();
        int regionCount = sheets.stream()
            .mapToInt(sheet -> sheet.regions() == null ? 0
                : sheet.regions().stream().mapToInt(ReportDesignDemoController::countRegions).sum())
            .sum();
        String reportId = "report_" + UUID.randomUUID();
        return ResponseEntity.ok(new ReportGenerateResp(reportId, "ACCEPTED", sheetCount, regionCount));
    }

    /** 递归统计一个 Region 及其所有子 Region 的数量，验证嵌套/递归结构被正确解析。 */
    private static int countRegions(Region region) {
        if (region == null) {
            return 0;
        }
        int childCount = region.children() == null ? 0
            : region.children().stream().mapToInt(ReportDesignDemoController::countRegions).sum();
        return 1 + childCount;
    }

    // ------------------------------------------------------------------
    // 顶层请求 / 响应
    // ------------------------------------------------------------------

    @Schema(description = "报表生成请求")
    public record ReportGenerateReq(
        @Schema(description = "数据输入配置（数据源/参数等，结构随业务变化，此处不做强约束）")
        Map<String, Object> inputConfig,
        @Schema(description = "工作簿本体数据（模板二进制引用、单元格快照等，结构随业务变化）")
        Map<String, Object> workbookData,
        @Schema(description = "输出配置：定义要生成哪些 Sheet 及每个 Sheet 的渲染规则")
        OutputConfig outputConfig
    ) {
    }

    @Schema(description = "输出配置")
    public record OutputConfig(
        @Schema(description = "要生成的 Sheet 列表")
        List<SheetConfig> sheets
    ) {
    }

    @Schema(description = "报表生成结果")
    public record ReportGenerateResp(
        @Schema(description = "生成的报表标识", example = "report_3f2a1b")
        String reportId,
        @Schema(description = "处理状态", example = "ACCEPTED")
        String status,
        @Schema(description = "解析到的 Sheet 数量（用于验证请求体被正确解析）", example = "1")
        Integer sheetCount,
        @Schema(description = "解析到的 Region 总数，包含递归展开的子 Region（用于验证递归结构被正确解析）", example = "2")
        Integer regionCount
    ) {
    }

    // ------------------------------------------------------------------
    // Sheet 级配置
    // ------------------------------------------------------------------

    @Schema(description = "单个 Sheet 的配置")
    public record SheetConfig(
        String sheetId,
        String templateSheetId,
        String nameExpression,
        SheetVisibility visibility,
        SheetExpansion sheetExpansion,
        List<Region> regions,
        @Schema(description = "整表级渲染规则，结构与单元格规则一致") List<CellRule> sheetRules,
        PrintOptions printOptions,
        SheetView sheetView,
        SheetProtection sheetProtection
    ) {
    }

    @Schema(description = "Sheet 可见性")
    public enum SheetVisibility { VISIBLE, HIDDEN, VERY_HIDDEN }

    @Schema(description = "Sheet 按数据集展开为多个 Sheet 的配置（如按部门各生成一张 Sheet）")
    public record SheetExpansion(
        String datasetRef,
        String itemsExpression,
        String itemAlias,
        String nameExpression,
        Integer maxSheets,
        ErrorPolicy errorPolicy
    ) {
    }

    // ------------------------------------------------------------------
    // Region（自引用递归结构）
    // ------------------------------------------------------------------

    @Schema(description = "渲染区域，可通过 children 嵌套子区域（递归结构）")
    public record Region(
        String regionId,
        CellRange sourceRange,
        RegionType type,
        Binding binding,
        Expansion expansion,
        Grouping grouping,
        List<MergeRule> mergeRules,
        List<CellRule> cellRules,
        List<SummaryRule> summaryRules,
        List<ImageRule> imageRules,
        List<ImageCollectionRule> imageCollectionRules,
        List<RichTextRule> richTextRules,
        List<FormulaRule> formulaRules,
        List<StyleRule> styleRules,
        List<CompositeContentRule> compositeContentRules,
        List<ConditionalFormatRule> conditionalFormatRules,
        List<HyperlinkRule> hyperlinkRules,
        List<CommentRule> commentRules,
        TableAccessibility tableAccessibility,
        @Schema(description = "子区域列表，与父区域结构完全相同（递归）") List<Region> children,
        EmptyDataPolicy emptyDataPolicy,
        @Schema(description = "无数据时的占位值，类型不固定") Object placeholderValue,
        ErrorPolicy errorPolicy,
        @Schema(description = "自定义元数据，键值均不做强约束") Map<String, Object> metadata
    ) {
    }

    public enum RegionType { STATIC, DYNAMIC_TABLE, LIST, GROUP }

    public enum EmptyDataPolicy { KEEP_TEMPLATE, REMOVE_TEMPLATE, SHOW_PLACEHOLDER }

    public enum ErrorPolicy { ABORT_REPORT, SKIP_REGION, SKIP_CELL, USE_DEFAULT }

    // ------------------------------------------------------------------
    // 数据绑定 / 展开 / 分组
    // ------------------------------------------------------------------

    @Schema(description = "数据绑定方式")
    public record Binding(
        BindingType type,
        String datasetRef,
        String expression,
        String itemAlias,
        @Schema(description = "取不到值时的默认值，类型不固定") Object defaultValue,
        String formatter
    ) {
    }

    public enum BindingType { VALUE, EXPRESSION, DATASET_REF }

    @Schema(description = "区域按数据展开的方式（如向下重复生成多行）")
    public record Expansion(
        ExpansionDirection direction,
        ExpansionMode mode,
        RepeatUnit repeatUnit,
        String crossExpression,
        String crossItemAlias,
        Integer capacity,
        Integer maxRows,
        Integer maxColumns
    ) {
    }

    public enum ExpansionDirection { VERTICAL, HORIZONTAL }

    public enum ExpansionMode { PUSH, INSERT, OVERWRITE }

    public enum RepeatUnit { CELL, ROW, COLUMN }

    @Schema(description = "分组与排序配置")
    public record Grouping(
        List<SortSpec> sorts,
        NullPolicy nullPolicy,
        List<Group> groups
    ) {
    }

    public enum NullPolicy { GROUP, SKIP }

    @Schema(description = "排序规则")
    public record SortSpec(
        String expression,
        SortDirection direction,
        NullsOrder nulls
    ) {
    }

    public enum SortDirection { ASC, DESC }

    public enum NullsOrder { FIRST, LAST }

    @Schema(description = "分组定义")
    public record Group(
        String groupId,
        List<String> keyExpressions,
        SortSpec sort,
        String headerRegionRef,
        String footerRegionRef,
        String summaryRegionRef,
        String nullLabel
    ) {
    }

    // ------------------------------------------------------------------
    // 各类渲染规则
    // ------------------------------------------------------------------

    @Schema(description = "合并单元格规则")
    public record MergeRule(
        String ruleId,
        MergeType type,
        CellTarget target,
        CellRange range,
        String keyExpression,
        String condition,
        Integer span,
        ExpansionDirection direction,
        NullPolicy nullPolicy,
        Boolean crossGroup,
        Integer priority,
        ConflictPolicy conflictPolicy,
        ErrorPolicy errorPolicy
    ) {
    }

    public enum MergeType { STATIC_COPY, DYNAMIC_COPY }

    public enum ConflictPolicy { ERROR, OVERWRITE, IGNORE }

    @Schema(description = "单元格取值/样式规则")
    public record CellRule(
        String ruleId,
        CellTarget target,
        String valueExpression,
        DisplayPolicy displayPolicy,
        RuleVisibility visibility,
        String formatter,
        Style style,
        ErrorPolicy errorPolicy
    ) {
    }

    public enum DisplayPolicy { EVERY_RECORD, FIRST_RECORD, LAST_RECORD }

    public enum RuleVisibility { ALWAYS, NEVER, CONDITIONAL }

    @Schema(description = "汇总规则（求和/计数等）")
    public record SummaryRule(
        String ruleId,
        SummaryType summaryType,
        String valueExpression,
        SummaryScope scope,
        String datasetRef,
        CellTarget target,
        String summaryRegionRef,
        DisplayPolicy displayPolicy,
        RuleVisibility visibility,
        String formatter,
        Style style,
        @Schema(description = "无数据时的默认值，类型不固定") Object defaultValue,
        ErrorPolicy errorPolicy
    ) {
    }

    public enum SummaryType { COUNT, SUM, AVG, MIN, MAX }

    public enum SummaryScope { REGION, SHEET, GROUP }

    @Schema(description = "单张图片规则")
    public record ImageRule(
        String ruleId,
        ImageSource source,
        CellRange anchor,
        ImageFit fit,
        ImageSize size,
        ImageFallback fallback,
        ErrorPolicy errorPolicy,
        String altText,
        Boolean decorative
    ) {
    }

    public enum ImageFit { CONTAIN, COVER, FILL, STRETCH }

    @Schema(description = "图片来源")
    public record ImageSource(
        String type,
        String expression,
        String value
    ) {
    }

    @Schema(description = "图片尺寸")
    public record ImageSize(
        Integer widthPx,
        Integer heightPx,
        Boolean preserveAspectRatio
    ) {
    }

    @Schema(description = "图片加载失败时的兜底策略")
    public record ImageFallback(
        ImageFallbackType type,
        String placeholderResourceId
    ) {
    }

    public enum ImageFallbackType { ERROR, PLACEHOLDER, SKIP }

    @Schema(description = "图片集合规则（如一个单元格区域内平铺多张图片）")
    public record ImageCollectionRule(
        String ruleId,
        String itemsExpression,
        ImageItemDefinition itemDefinition,
        ImageCollectionLayout layout,
        Integer columns,
        Integer gapPx,
        Boolean wrap,
        Integer maxItems,
        CellRange anchor,
        PartialFailurePolicy partialFailurePolicy,
        ErrorPolicy errorPolicy
    ) {
    }

    @Schema(description = "图片集合中单张图片的定义")
    public record ImageItemDefinition(
        ImageSource source,
        ImageFit fit,
        ImageSize size,
        ImageFallback fallback,
        String altText,
        Boolean decorative
    ) {
    }

    public enum ImageCollectionLayout { HORIZONTAL, VERTICAL, GRID }

    public enum PartialFailurePolicy { ABORT_COLLECTION, SKIP_ITEM }

    @Schema(description = "富文本规则（一个单元格内多段不同样式的文本）")
    public record RichTextRule(
        String ruleId,
        CellTarget target,
        List<RichTextSegment> segments,
        Boolean wrap,
        RichTextAlignment alignment,
        OverflowPolicy overflowPolicy,
        ErrorPolicy errorPolicy
    ) {
    }

    @Schema(description = "富文本片段")
    public record RichTextSegment(
        String type,
        String expression,
        String formatter,
        FontStyle style,
        Hyperlink hyperlink,
        RuleVisibility visibility,
        ErrorPolicy errorPolicy
    ) {
    }

    @Schema(description = "超链接")
    public record Hyperlink(
        String href
    ) {
    }

    public enum RichTextAlignment { LEFT, CENTER, RIGHT }

    public enum OverflowPolicy { CLIP, WRAP, SHRINK_TO_FIT }

    @Schema(description = "公式规则")
    public record FormulaRule(
        String ruleId,
        CellTarget target,
        FormulaSource source,
        RecalculationPolicy recalculationPolicy,
        SheetReferenceStrategy sheetReferenceStrategy,
        ErrorPolicy errorPolicy
    ) {
    }

    @Schema(description = "公式来源")
    public record FormulaSource(
        String type,
        String formula
    ) {
    }

    public enum RecalculationPolicy { AUTO, MANUAL }

    @Schema(description = "跨 Sheet 引用策略（用于展开出多个 Sheet 后，公式如何汇总引用）")
    public record SheetReferenceStrategy(
        SheetReferenceStrategyType type,
        String selector,
        ReduceType reduce
    ) {
    }

    public enum SheetReferenceStrategyType { MATCH_CURRENT, MATCH_ALL }

    public enum ReduceType { SUM, AVG, COUNT, MIN, MAX }

    @Schema(description = "样式规则（按条件应用一组样式覆盖）")
    public record StyleRule(
        String ruleId,
        CellTarget target,
        String baseStyleRef,
        String condition,
        Style overrides,
        Integer priority,
        ErrorPolicy errorPolicy
    ) {
    }

    @Schema(description = "组合内容规则（富文本与图片按布局组合展示）")
    public record CompositeContentRule(
        String ruleId,
        String richTextRuleRef,
        List<String> imageRuleRefs,
        CompositeLayout layout,
        ErrorPolicy errorPolicy
    ) {
    }

    public enum CompositeLayout { ADJACENT, OVERLAY }

    @Schema(description = "条件格式规则")
    public record ConditionalFormatRule(
        String ruleId,
        CellRange target,
        Integer priority,
        Boolean stopIfTrue,
        ConditionalRuleType ruleType,
        ConditionalOperator operator,
        String formula,
        String expression,
        @Schema(description = "比较值 1，类型不固定") Object value1,
        @Schema(description = "比较值 2，类型不固定") Object value2,
        Style stylePatch,
        ErrorPolicy errorPolicy
    ) {
    }

    public enum ConditionalRuleType { CELL_VALUE, FORMULA }

    public enum ConditionalOperator { EQUAL, NOT_EQUAL, GREATER_THAN, LESS_THAN, BETWEEN }

    @Schema(description = "超链接规则")
    public record HyperlinkRule(
        String ruleId,
        CellTarget target,
        HyperlinkSource source,
        String label,
        String accessibleLabel,
        String tooltip,
        ErrorPolicy errorPolicy
    ) {
    }

    @Schema(description = "超链接来源")
    public record HyperlinkSource(
        String type,
        String fileId
    ) {
    }

    @Schema(description = "批注规则")
    public record CommentRule(
        String ruleId,
        CellTarget target,
        String text,
        String authorDisplayName,
        Boolean visible,
        ErrorPolicy errorPolicy
    ) {
    }

    @Schema(description = "无障碍表格信息")
    public record TableAccessibility(
        String logicalTableId,
        String caption,
        Integer headerRows,
        Integer headerColumns,
        AccessibilityScope scope
    ) {
    }

    public enum AccessibilityScope { ROW, COLUMN }

    // ------------------------------------------------------------------
    // 通用位置 / 样式类型
    // ------------------------------------------------------------------

    @Schema(description = "单元格范围")
    public record CellRange(
        String sheetId,
        Integer startRow,
        Integer startColumn,
        Integer endRow,
        Integer endColumn
    ) {
    }

    @Schema(description = "单个目标单元格")
    public record CellTarget(
        @Schema(description = "目标类型，具体取值由业务定义，如 CELL/RANGE 等") String type,
        String sheetId,
        Integer row,
        Integer column
    ) {
    }

    @Schema(description = "行范围")
    public record RowRange(
        Integer startRow,
        Integer endRow
    ) {
    }

    @Schema(description = "单元格样式")
    public record Style(
        FontStyle font,
        Fill fill,
        Border border,
        Alignment alignment,
        String numberFormat,
        Protection protection
    ) {
    }

    @Schema(description = "字体样式")
    public record FontStyle(
        String name,
        Integer sizePt,
        Boolean bold,
        Boolean italic,
        Boolean underline,
        Boolean strikeout,
        String color
    ) {
    }

    @Schema(description = "填充样式")
    public record Fill(
        FillPattern pattern,
        String foregroundColor,
        String backgroundColor
    ) {
    }

    public enum FillPattern { NONE, SOLID }

    @Schema(description = "边框样式")
    public record Border(
        BorderSide top,
        BorderSide bottom,
        BorderSide left,
        BorderSide right,
        BorderSide diagonal,
        DiagonalType diagonalType
    ) {
    }

    @Schema(description = "单条边框线")
    public record BorderSide(
        BorderLineStyle style,
        String color
    ) {
    }

    public enum BorderLineStyle { NONE, THIN, MEDIUM, THICK, DASHED, DOTTED }

    public enum DiagonalType { NONE, UP, DOWN, BOTH }

    @Schema(description = "对齐方式")
    public record Alignment(
        HorizontalAlign horizontal,
        VerticalAlign vertical,
        Boolean wrapText,
        Boolean verticalText,
        Integer rotation,
        Integer indent
    ) {
    }

    public enum HorizontalAlign { GENERAL, LEFT, CENTER, RIGHT }

    public enum VerticalAlign { TOP, MIDDLE, BOTTOM }

    @Schema(description = "单元格保护设置")
    public record Protection(
        Boolean locked,
        Boolean hidden
    ) {
    }

    // ------------------------------------------------------------------
    // 打印 / 视图 / 保护
    // ------------------------------------------------------------------

    @Schema(description = "打印选项")
    public record PrintOptions(
        PaperSize paperSize,
        PageOrientation orientation,
        Boolean fitToPage,
        Integer fitWidth,
        Integer fitHeight,
        Integer scale,
        Margins margins,
        CellRange printArea,
        RowRange repeatTitleRows,
        Boolean centerHorizontally,
        Boolean centerVertically,
        Boolean printGridlines,
        Boolean printHeadings,
        Boolean blackAndWhite,
        List<PageBreak> pageBreaks
    ) {
    }

    public enum PaperSize { A4, A3, LETTER, LEGAL }

    public enum PageOrientation { PORTRAIT, LANDSCAPE }

    @Schema(description = "页边距")
    public record Margins(
        Double top,
        Double bottom,
        Double left,
        Double right,
        Double header,
        Double footer
    ) {
    }

    @Schema(description = "分页位置")
    public record PageBreak(
        PageBreakType type,
        Integer index
    ) {
    }

    public enum PageBreakType { ROW, COLUMN }

    @Schema(description = "Sheet 视图设置")
    public record SheetView(
        Integer freezeRows,
        Integer freezeColumns,
        Integer activeCellRow,
        Integer activeCellColumn,
        Integer zoomPercent,
        Boolean showGridlines
    ) {
    }

    @Schema(description = "Sheet 保护设置")
    public record SheetProtection(
        String protectionKeyRef,
        Boolean allowSelectLockedCells,
        Boolean allowSelectUnlockedCells,
        Boolean allowFormatCells,
        Boolean allowInsertRows,
        Boolean allowInsertColumns,
        Boolean allowDeleteRows,
        Boolean allowDeleteColumns
    ) {
    }
}