declare var Chart: any;

export class ChartBuilder {
    private readonly _chart: any;
    /*
    https://coolors.co/palette/f94144-f3722c-f8961e-f9c74f-90be6d-43aa8b-4d908e-577590
    https://coolors.co/palette/ff595e-ff924c-ffca3a-c5ca30-8ac926-36949d-1982c4-4267ac-565aa0-6a4c93
    https://coolors.co/palette/264653-287271-2a9d8f-8ab17d-babb74-e9c46a-efb366-f4a261-ee8959-e76f51
    https://coolors.co/palette/264653-287271-2a9d8f-8ab17d-e9c46a-f4a261-ee8959-e76f51
    */
    private readonly _colors = ['#F94144', '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#4D908E', '#577590'];

    private _benchmarkResultRows: IBenchmarkResultRow[] = [];
    private _theme = Theme.Dark;
    private _yAxeTextColor = '#606060';
    private _xAxeTextColor = '#606060';
    private _gridLineColor = '';
    private _creditTextColor = '';
    private _scaleType = ScaleType.Linear;

    get theme() {
        return this._theme;
    }
    set theme(value) {
        switch (value) {
            case Theme.Dark:
                this._creditTextColor = '#66666675';
                this._gridLineColor = '#66666638';
                break;
            case Theme.Light:
                this._creditTextColor = '#00000040';
                this._gridLineColor = '#0000001a';
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

    private get chartPlugins() {
        return this._chart.config.options.plugins;
    }

    private get chartScales() {
        return this._chart.config.options.scales;
    }

    constructor(canvas: HTMLCanvasElement) {
        this._chart = getChart();
        this.theme = this.theme;

        function getChart() {
            const config = {
                type: 'bar',
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        subtitle: {
                            display: true,
                            text: 'Made with chartbenchmark.net',
                            position: 'right',
                            align: 'center',
                            fullSize: false,
                            font: {
                                size: 10,
                                family: 'SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace'
                            }
                        }
                    },
                    scales: {
                        y: {
                            title: {
                                display: true
                            }
                        },
                        x: {
                            title: {
                                display: true
                            }
                        }
                    }
                }
            };

            return new Chart(canvas.getContext('2d'), config);
        }
    }

    loadBenchmarkResult(text: string) {
        this._benchmarkResultRows = text
            .split('\n')
            .map(i => i.trim())
            .filter(i => i.length > 2 && i.startsWith('|') && i.endsWith('|'))
            .filter((i, index) => index !== 1)
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
        const runtimeIndex = headerRow.columns.indexOf('Runtime');
        const meanIndex = headerRow.columns.lastIndexOf('Mean');

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

            const mean = getMeasure(row.columns[meanIndex]);

            const result: IMethodResult = {
                category: category,
                mean: mean,
                allocated: allocatedIndex >= 0 ? getMeasure(row.columns[allocatedIndex]) : null
            };

            methodInfo.results.push(result);
        }

        return {
            categories: getCategories(),
            categoriesTitle: getCategoriesTitle(),
            methods: getMethods(),
            unit: inferUnit()
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

        function inferUnit() {
            for (const method of methods) {
                for (const result of method[1].results) {
                    switch (result.mean.unit) {
                        case 'us':
                        case 'μs':
                            return 'Microseconds';
                        case 'ms':
                            return 'Milliseconds';
                        case 's':
                            return 'Seconds';
                        default:
                            return result.mean.unit;
                    }
                }
            }
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
        const xAxe = this.chartScales.x;
        const chartData = this._chart.data;
        const benchmarkResult = this.getBenchmarkResult();

        if (benchmarkResult === null) {
            yAxe.title.text = '';
            xAxe.title.text = '';
            chartData.labels = [];
            chartData.datasets = [];
            this._chart.update();
            return;
        }

        this.chartPlugins.subtitle.color = this._creditTextColor;

        yAxe.title.text = benchmarkResult.unit;
        yAxe.title.color = this._yAxeTextColor;
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

        xAxe.title.text = benchmarkResult.categoriesTitle;
        xAxe.title.color = this._xAxeTextColor;
        xAxe.grid.color = this._gridLineColor;

        chartData.labels = benchmarkResult.categories;

        const indexByCategory = new Map<string, number>();
        for (let index = 0; index < benchmarkResult.categories.length; index++) {
            indexByCategory.set(benchmarkResult.categories[index], index);
        }

        const colors = this._colors;
        let colorIndex = 0;

        const datasets = benchmarkResult.methods
            .map(m => ({
                label: m.name,
                data: getData(m.results, r => r.mean.value),
                backgroundColor: getNextColor(),
                order: 1
            }));

        // const r =
        //     benchmarkResult.methods
        //     .map(i=> [].concat(...(i.results as any) ))
        //     .filter(i=>i.results.reduce)
        //     .map(m => ({
        //         label: m.name,
        //         data: getData(m.results, r => r.mean.value),
        //         backgroundColor: getNextColor()
        //     }));

        // datasets.push(
        //     ...benchmarkResult.methods
        //         .filter(i => i.results.some(i => i.allocated !== null))
        //         .map(m => ({
        //             label: m.name,
        //             data: getData(m.results, r => r.allocated!.value),
        //             backgroundColor: getNextColor(),
        //             // type: 'line',
        //             order: 0
        //         }))
        // );

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
    mean: IMeasure,
    allocated: IMeasure | null
}

interface IMethodInfo {
    name: string;
    order: number;
    results: IMethodResult[];
}

export enum Theme {
    Dark = 'dark',
    Light = 'light'
}

export enum ScaleType {
    Linear = 'linear',
    Log10 = 'log10',
    Log2 = 'log2'
}