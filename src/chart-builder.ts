import { Chart } from "chart.js";
import { color } from "chart.js/helpers";

export class ChartBuilder {
    private readonly _chart: any;

    static readonly palettes: IPalette[] = [
        {
            id: 'default',
            title: 'Default',
            colors: ['#F94144', '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#4D908E', '#577590']
        },
        {
            id: 'warm',
            title: 'Warm',
            colors: ['#264653', '#287271', '#2A9D8F', '#8AB17D', '#E9C46A', '#F4A261', '#EE8959', '#E76F51']
        },
        // Colorblind-friendly palettes
        {
            id: 'colorblind-safe',
            title: 'Colorblind Safe',
            colors: ['#4477AA', '#66CCEE', '#228833', '#CCBB44', '#EE6677', '#AA3377', '#BBBBBB', '#000000']
        },
        {
            id: 'deuteranopia',
            title: 'Deuteranopia Friendly',
            colors: ['#1B9E77', '#D95F02', '#7570B3', '#E7298A', '#66A61E', '#E6AB02', '#A6761D', '#666666']
        },
        {
            id: 'high-contrast',
            title: 'High Contrast',
            colors: ['#0173B2', '#DE8F05', '#029E73', '#CC78BC', '#CA9161', '#FBAFE4', '#949494', '#ECE133']
        },
        {
            id: 'colorblind-print',
            title: 'Colorblind Print',
            colors: ['#4053D3', '#DDB310', '#B51D14', '#00BEFF', '#FB49B0', '#00B25D', '#CACACA', '#000000']
        },
        // Primary color-based palettes
        {
            id: 'blue-theme',
            title: 'Blue Theme',
            colors: ['#0D47A1', '#1976D2', '#2196F3', '#42A5F5', '#64B5F6', '#90CAF9', '#BBDEFB', '#E3F2FD']
        },
        {
            id: 'red-theme',
            title: 'Red Theme',
            colors: ['#B71C1C', '#D32F2F', '#F44336', '#E57373', '#EF5350', '#FF6F60', '#FF8A80', '#FFCDD2']
        },
        {
            id: 'green-theme',
            title: 'Green Theme',
            colors: ['#1B5E20', '#388E3C', '#4CAF50', '#66BB6A', '#81C784', '#A5D6A7', '#C8E6C9', '#E8F5E9']
        },
        {
            id: 'purple-theme',
            title: 'Purple Theme',
            colors: ['#4A148C', '#6A1B9A', '#8E24AA', '#AB47BC', '#BA68C8', '#CE93D8', '#E1BEE7', '#F3E5F5']
        },
        {
            id: 'orange-theme',
            title: 'Orange Theme',
            colors: ['#E65100', '#F57C00', '#FF9800', '#FFA726', '#FFB74D', '#FFCC80', '#FFE0B2', '#FFF3E0']
        },
        {
            id: 'teal-theme',
            title: 'Teal Theme',
            colors: ['#004D40', '#00695C', '#00897B', '#26A69A', '#4DB6AC', '#80CBC4', '#B2DFDB', '#E0F2F1']
        },
        {
            id: 'amber-theme',
            title: 'Amber Theme',
            colors: ['#FF6F00', '#FF8F00', '#FFA000', '#FFB300', '#FFC107', '#FFCA28', '#FFD54F', '#FFECB3']
        },
        {
            id: 'indigo-theme',
            title: 'Indigo Theme',
            colors: ['#1A237E', '#283593', '#3F51B5', '#5C6BC0', '#7986CB', '#9FA8DA', '#C5CAE9', '#E8EAF6']
        }
    ];

    private _colors = ChartBuilder.palettes[0].colors;
    private _paletteId = ChartBuilder.palettes[0].id;

    private _benchmarkResultRows: IBenchmarkResultRow[] = [];
    private _theme = Theme.Dark;
    private _yAxisTextColor = '#606060';

    private _y2AxisBaseColor = '#A600FF';
    private _y2AxisGridLineColor = this._y2AxisBaseColor;
    private _y2AxisTextColor = this._y2AxisBaseColor;
    private _y2AxisBarColor = color(this._y2AxisBaseColor).clearer(0.3).hexString();

    private _xAxisTextColor = '#606060';
    private _gridLineColor = '';
    private _creditTextColor = '';
    private _scaleType = ScaleType.Log2;

    private _displayMode = DisplayMode.All;

    private _hasAllocationData = false;

    get theme() {
        return this._theme;
    }
    set theme(value) {
        switch (value) {
            case Theme.Dark:
                this._creditTextColor = '#66666675';
                this._gridLineColor = '#66666638';
                this._y2AxisGridLineColor = color(this._y2AxisBaseColor).clearer(0.5).hexString();
                break;
            case Theme.Light:
                this._creditTextColor = '#00000040';
                this._gridLineColor = '#0000001a';
                this._y2AxisGridLineColor = color(this._y2AxisBaseColor).clearer(0.75).hexString();
                break;
            default:
                break;
        }
        this._theme = value;
        this.render();
    }

    get scaleType() {
        return this._scaleType;
    }
    set scaleType(value) {
        this._scaleType = value;
        this.render();
    }

    get displayMode() {
        return this._displayMode;
    }
    set displayMode(value) {
        this._displayMode = value;
        this.render();
    }

    get hasAllocationData() {
        return this._hasAllocationData && (this.displayMode === DisplayMode.All || this.displayMode === DisplayMode.Allocation);
    }

    get palette() {
        return this._paletteId;
    }
    set palette(value) {
        const palette = ChartBuilder.palettes.find(p => p.id === value);
        if (palette) {
            this._paletteId = value;
            this._colors = palette.colors;
            this.render();
        }
    }

    private get chartPlugins() {
        return this._chart.config.options.plugins;
    }

    private get chartScales() {
        return this._chart.config.options.scales;
    }

    constructor(canvas: HTMLCanvasElement) {
        this._chart = getChart();
        this.theme = this.theme;
        const that = this;

        function getChart() {
            const numberFormat = new Intl.NumberFormat('en-US', { style: 'decimal' });

            const config = {
                type: 'bar',
                options: {
                    maintainAspectRatio: false,
                    responsive: true,
                    plugins: {
                        subtitle: {
                            display: true,
                            text: 'Made with chartbenchmark.net',
                            position: 'right',
                            align: 'center',
                            fullSize: false,
                            font: {
                                size: 11,
                                family: 'SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace'
                            }
                        },
                        legend: {
                            labels: {
                                usePointStyle: true,
                                filter: (legend: any, data: any) => {
                                    const display =
                                        (that.displayMode === DisplayMode.Allocation && that.hasAllocationData) ||
                                        data.datasets[legend.datasetIndex].isDuration === true;

                                    return display;
                                }
                            },
                            onClick: (_: any, legendItem: any, legend: any) => {
                                const index = legendItem.datasetIndex;
                                const ci = legend.chart;
                                const hideAllocation = that.displayMode === DisplayMode.All && that.hasAllocationData;

                                if (ci.isDatasetVisible(index)) {
                                    if (hideAllocation) {
                                        ci.hide(index + 1);
                                    }
                                    ci.hide(index);
                                    legendItem.hidden = true;
                                } else {
                                    if (hideAllocation) {
                                        ci.show(index + 1);
                                    }
                                    ci.show(index);
                                    legendItem.hidden = false;
                                }
                            }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context: any) => {
                                    const dataset = context.dataset as IDataset;

                                    let label = dataset.label || '';

                                    if (dataset.isDuration) {
                                        label += ' - Duration: ';
                                    }
                                    else if (dataset.isAllocation) {
                                        label += ' - Memory Allocation: ';
                                    }

                                    if (context.parsed.y !== null) {
                                        label += `${numberFormat.format(context.parsed.y)} ${dataset.unitInfo.short}`;
                                    }

                                    return label;
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true
                            },
                            display: 'auto'
                        },
                        y2: {
                            title: {
                                display: true
                            },
                            position: 'right',
                            display: 'auto'
                        },
                        x: {
                            title: {
                                display: true
                            },
                            display: 'auto'
                        }
                    }
                }
            };

            return new Chart(<any>canvas.getContext('2d'), <any>config);
        }
    }

    loadBenchmarkResult(text: string) {
        this._benchmarkResultRows = text
            .split('\n')
            .map(i => i.trim())
            .filter(i => i.length > 2 && i.startsWith('|') && i.endsWith('|'))
            .filter((_, index) => index !== 1)
            .map(i => ({
                text: i,
                columns: i
                    .split('|')
                    .slice(1, -1)
                    .map(i => i.replace(/\*/g, '').trim())
            }))
            .filter(i => i.columns.some(c => c.length > 0));

        this.render();
    }

    private getBenchmarkResult() {
        const rows = this._benchmarkResultRows;

        if (rows.length === 0) {
            return null;
        }

        const headerRow = rows[0];
        const methodIndex = headerRow.columns.indexOf('Method');
        const meanIndex = headerRow.columns.lastIndexOf('Mean');

        if (methodIndex < 0 || meanIndex < 0) {
            return null;
        }

        const runtimeIndex = headerRow.columns.indexOf('Runtime');

        const categoryIndexStart = Math.max(methodIndex, runtimeIndex) + 1;
        const categoryIndexEnd = meanIndex - 1;

        const allocatedIndex = headerRow.columns.indexOf('Allocated', meanIndex);

        const methods = new Map<string, IMethodInfo>();
        const orderByMethod = new Map<string, number>();

        for (const row of rows) {
            if (row === headerRow) {
                continue;
            }

            let category = '';

            for (let i = categoryIndexStart; i <= categoryIndexEnd; i++) {
                const separator = category.length > 0 ? ', ' : '';
                category += `${separator}${row.columns[i]}`;
            }

            const runtimeName = runtimeIndex >= 0 ? row.columns[runtimeIndex] : null;

            const methodNamePrefix = row.columns[methodIndex];
            const methodName = methodNamePrefix + (runtimeName !== null ? ` (${runtimeName})` : '');
            let methodInfo = methods.get(methodName);

            if (typeof (methodInfo) === 'undefined') {
                let methodOrder = orderByMethod.get(methodNamePrefix);

                if (typeof (methodOrder) === 'undefined') {
                    methodOrder = orderByMethod.size;
                    orderByMethod.set(methodNamePrefix, methodOrder);
                }

                methodInfo = {
                    name: methodName,
                    order: methodOrder,
                    results: []
                };

                methods.set(methodName, methodInfo);
            }

            const durationMean = getMeasure(row.columns[meanIndex]);

            const result: IMethodResult = {
                category: category,
                duration: durationMean,
                allocation: allocatedIndex >= 0 ? getMeasure(row.columns[allocatedIndex]) : null
            };

            methodInfo.results.push(result);
        }

        const methodsArray = getMethods();

        return {
            categories: getCategories(),
            categoriesTitle: getCategoriesTitle(),
            methods: methodsArray,
            durationUnit: inferDurationUnit(),
            allocationUnit: inferAllocationUnit()
        };

        function getCategories() {
            const categories = new Set<string>();
            for (const method of methods) {
                for (const result of method[1].results) {
                    categories.add(result.category);
                }
            }
            return [...categories];
        }

        function getCategoriesTitle() {
            let title = '';
            for (let i = categoryIndexStart; i <= categoryIndexEnd; i++) {
                const separator = title.length > 0 ? ', ' : '';
                title += `${separator}${headerRow.columns[i]}`;
            }
            return title;
        }

        function getMethods() {
            return [...methods]
                .map(i => i[1])
                .sort((a, b) => a.order - b.order);
        }

        function inferDurationUnit() {
            const info: IUnitInfo = {
                short: '',
                long: ''
            };

            for (const method of methods) {
                for (const result of method[1].results) {
                    info.short = result.duration.unit;

                    switch (result.duration.unit) {
                        case 'us':
                        case 'μs':
                            info.long = 'Microseconds';
                            break;
                        case 'ms':
                            info.long = 'Milliseconds';
                            break;
                        case 's':
                            info.long = 'Seconds';
                            break;
                        default:
                            info.long = result.duration.unit;
                            break;
                    }

                    return info;
                }
            }

            return info;
        }

        function inferAllocationUnit() {
            const info: IUnitInfo = {
                short: '',
                long: ''
            };

            for (const method of methods) {
                for (const result of method[1].results) {
                    if (result.allocation === null) {
                        continue;
                    }

                    info.short = result.allocation.unit;

                    switch (result.allocation.unit) {
                        case 'B':
                            info.long = 'Bytes';
                            break;
                        case 'KB':
                            info.long = 'Kilobytes';
                            break;
                        case 'MB':
                            info.long = 'Megabytes';
                            break;
                        case 'GB':
                            info.long = 'Gigabytes';
                            break;
                        case 'TB':
                            info.long = 'Terabytes';
                            break;
                        case 'PB':
                            info.long = 'Petabytes';
                            break;
                        default:
                            info.long = result.allocation.unit;
                            break;
                    }

                    return info;
                }
            }

            return info;
        }

        function getMeasure(formattedNumber: string): IMeasure {
            const unitSeparatorIndex = formattedNumber.indexOf(' ');
            const unit = unitSeparatorIndex >= 0 ? formattedNumber.substring(unitSeparatorIndex).trim() : '';
            const value = parseFloat(formattedNumber.replace(/[^0-9.]/g, ''));
            return {
                value,
                unit
            }
        }
    }

    private render() {
        const yAxe = this.chartScales.y;
        const y2Axe = this.chartScales.y2;
        const xAxe = this.chartScales.x;
        const chartData = this._chart.data;
        const benchmarkResult = this.getBenchmarkResult();

        yAxe.title.text = '';
        y2Axe.title.text = '';
        xAxe.title.text = '';
        chartData.labels.length = 0;
        chartData.datasets.length = 0;
        this._hasAllocationData = false;

        if (benchmarkResult === null) {
            this._chart.update();
            return;
        }

        this._hasAllocationData = benchmarkResult.methods
            .some(m => m.results.some(r => r.allocation !== null));

        this.chartPlugins.subtitle.color = this._creditTextColor;

        yAxe.title.text = `Duration (${benchmarkResult.durationUnit.long})`;
        yAxe.title.color = this._yAxisTextColor;
        yAxe.grid.color = this._gridLineColor;

        switch (this.scaleType) {
            case ScaleType.Log10:
                yAxe.type = 'logarithmic';
                break;
            case ScaleType.Log2:
                yAxe.type = 'log2';
                break;
            default:
                yAxe.type = 'linear';
                break;
        }

        y2Axe.title.text = `Memory Allocation (${benchmarkResult.allocationUnit.long})`;
        y2Axe.title.color = this._y2AxisTextColor;
        y2Axe.ticks.color = this._y2AxisTextColor;
        y2Axe.grid.color = this._y2AxisGridLineColor;
        y2Axe.type = yAxe.type;

        xAxe.title.text = benchmarkResult.categoriesTitle;
        xAxe.title.color = this._xAxisTextColor;
        xAxe.grid.color = this._gridLineColor;

        if (this.displayMode === DisplayMode.Allocation) {
            if (!this.hasAllocationData) {
                this._chart.update();
                return;
            }

            yAxe.title.text = y2Axe.title.text;
        }

        chartData.labels = benchmarkResult.categories;

        const indexByCategory = new Map<string, number>();
        for (let index = 0; index < benchmarkResult.categories.length; index++) {
            indexByCategory.set(benchmarkResult.categories[index], index);
        }

        const colors = this._colors;
        let colorIndex = 0;

        const datasets = [];

        for (const methodInfo of benchmarkResult.methods) {
            const color = getNextColor();

            if (this.displayMode === DisplayMode.All || this.displayMode === DisplayMode.Duration) {
                const durationDataset = {
                    isDuration: true,
                    label: methodInfo.name,
                    data: getData(methodInfo.results, r => r.duration.value),
                    backgroundColor: color,
                    stack: methodInfo.name,
                    yAxisID: 'y',
                    unitInfo: benchmarkResult.durationUnit,
                    order: 2,
                    barPercentage: 0.9,
                    pointStyle: 'rect'
                };

                datasets.push(durationDataset);
            }

            if (this.hasAllocationData && (this.displayMode === DisplayMode.All || this.displayMode === DisplayMode.Allocation)) {
                const allocationDataset = {
                    isAllocation: true,
                    label: methodInfo.name,
                    data: getData(methodInfo.results, r => r.allocation === null ? 0 : r.allocation.value),
                    backgroundColor: this._y2AxisBarColor,
                    stack: methodInfo.name,
                    yAxisID: 'y2',
                    unitInfo: benchmarkResult.allocationUnit,
                    order: 1,
                    barPercentage: 0.2,
                    pointStyle: 'rect'
                };

                if (this.displayMode === DisplayMode.Allocation) {
                    allocationDataset.backgroundColor = color;
                    allocationDataset.yAxisID = 'y';
                    allocationDataset.barPercentage = 0.9;
                }

                datasets.push(allocationDataset);
            }
        }

        chartData.datasets = datasets;

        function getData(results: IMethodResult[], getResultCallback: (r: IMethodResult) => number) {
            const data: number[] = new Array(indexByCategory.size);
            for (const result of results) {
                const index = indexByCategory.get(result.category);
                if (index !== undefined) {
                    data[index] = getResultCallback(result);
                }
            }
            return data;
        }

        function getNextColor() {
            if ((colorIndex ^ colors.length) === 0) {
                colorIndex = 0;
            }
            return colors[colorIndex++];
        }

        this._chart.update();
    }
}

interface IBenchmarkResultRow {
    text: string,
    columns: string[]
}

interface IMeasure {
    value: number,
    unit: string
}

interface IMethodResult {
    category: string,
    duration: IMeasure,
    allocation: IMeasure | null
}

interface IMethodInfo {
    name: string;
    order: number;
    results: IMethodResult[];
}

interface IUnitInfo {
    short: string,
    long: string
}

interface IDataset {
    label: string,
    isDuration?: boolean,
    isAllocation?: boolean,
    unitInfo: IUnitInfo
}

export interface IPalette {
    id: string,
    title: string,
    colors: string[]
}

export enum Theme {
    Dark = 'Dark',
    Light = 'Light'
}

export enum ScaleType {
    Linear = 'Linear',
    Log10 = 'Log10',
    Log2 = 'Log2'
}

export enum DisplayMode {
    All = 'All',
    Duration = 'Duration',
    Allocation = 'Allocation'
}