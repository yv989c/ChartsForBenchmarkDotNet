"use strict";
var Chart;
var Theme;
(function (Theme) {
    Theme["Dark"] = "dark";
    Theme["Light"] = "light";
})(Theme || (Theme = {}));
class ChartBuilder {
    constructor(canvas) {
        /*
        https://coolors.co/palette/f94144-f3722c-f8961e-f9c74f-90be6d-43aa8b-4d908e-577590
        https://coolors.co/palette/ff595e-ff924c-ffca3a-c5ca30-8ac926-36949d-1982c4-4267ac-565aa0-6a4c93
        https://coolors.co/palette/264653-287271-2a9d8f-8ab17d-babb74-e9c46a-efb366-f4a261-ee8959-e76f51
        https://coolors.co/palette/264653-287271-2a9d8f-8ab17d-e9c46a-f4a261-ee8959-e76f51
        */
        this._colors = ['#F94144', '#F3722C', '#F8961E', '#F9C74F', '#90BE6D', '#43AA8B', '#4D908E', '#577590'];
        this._benchmarkResultRows = [];
        this._theme = Theme.Dark;
        this._yAxeTextColor = '#606060';
        this._xAxeTextColor = '#606060';
        this._gridLineColor = '';
        this._creditTextColor = '';
        this._useLogarithmicScale = false;
        Chart.defaults.font.family = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans","Liberation Sans",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';
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
    get useLogarithmicScale() {
        return this._useLogarithmicScale;
    }
    set useLogarithmicScale(value) {
        this._useLogarithmicScale = value;
        this.render();
    }
    get chartPlugins() {
        return this._chart.config.options.plugins;
    }
    get chartScales() {
        return this._chart.config.options.scales;
    }
    loadBenchmarkResult(text) {
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
    getBenchmarkResult() {
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
        const methods = new Map();
        for (const row of rows) {
            if (row === headerRow) {
                continue;
            }
            let category = '';
            for (let i = categoryIndexStart; i <= categoryIndexEnd; i++) {
                const separator = category.length > 0 ? ', ' : '';
                category += `${separator}${row.columns[i]}`;
            }
            const methodName = row.columns[methodIndex];
            let methodValues = methods.get(methodName);
            if (typeof (methodValues) === 'undefined') {
                methodValues = [];
                methods.set(methodName, methodValues);
            }
            const valueAndScale = getValueAndScale(row.columns[meanIndex]);
            methodValues.push({
                category: category,
                value: valueAndScale.value,
                scale: valueAndScale.scale
            });
        }
        return {
            categories: getCategories(),
            categoriesTitle: getCategoriesTitle(),
            methods: getMethods(),
            scale: inferScale()
        };
        function getCategories() {
            const categories = new Set();
            for (const method of methods) {
                for (const value of method[1]) {
                    categories.add(value.category);
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
                .map(i => ({
                name: i[0],
                values: i[1]
            }));
        }
        function inferScale() {
            for (const method of methods) {
                for (const value of method[1]) {
                    switch (value.scale) {
                        case 'us':
                        case 'μs':
                            return 'Microseconds';
                        case 'ms':
                            return 'Milliseconds';
                        case 's':
                            return 'Seconds';
                        default:
                            return value.scale;
                    }
                }
            }
        }
        function getValueAndScale(formattedNumber) {
            const scaleSeparatorIndex = formattedNumber.indexOf(' ');
            const scale = scaleSeparatorIndex >= 0 ? formattedNumber.substring(scaleSeparatorIndex).trim() : '';
            const value = parseFloat(formattedNumber.replace(/[^0-9.]/g, ''));
            return {
                value,
                scale
            };
        }
    }
    render() {
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
        yAxe.title.text = benchmarkResult.scale;
        yAxe.title.color = this._yAxeTextColor;
        yAxe.grid.color = this._gridLineColor;
        yAxe.type = this.useLogarithmicScale ? 'logarithmic' : 'linear';
        xAxe.title.text = benchmarkResult.categoriesTitle;
        xAxe.title.color = this._xAxeTextColor;
        xAxe.grid.color = this._gridLineColor;
        chartData.labels = benchmarkResult.categories;
        const indexByCategory = new Map();
        for (let index = 0; index < benchmarkResult.categories.length; index++) {
            indexByCategory.set(benchmarkResult.categories[index], index);
        }
        const colors = this._colors;
        let colorIndex = 0;
        chartData.datasets = benchmarkResult.methods
            .map(m => ({
            label: m.name,
            data: getData(m.values),
            backgroundColor: getNextColor()
        }));
        function getData(values) {
            const data = new Array(indexByCategory.size);
            for (const value of values) {
                const index = indexByCategory.get(value.category);
                if (index !== undefined) {
                    data[index] = value.value;
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
class App {
    constructor() {
        const chartWrapper = document.getElementById('chartWrapper');
        const chartCanvas = document.getElementById('chartCanvas');
        const builder = new ChartBuilder(chartCanvas);
        this.bindResultsInput(builder);
        this.bindSizeControls(chartWrapper);
        document.getElementById('themeRadioContainer').addEventListener('input', e => {
            builder.theme = e.target.value;
            switch (builder.theme) {
                case Theme.Dark:
                    chartWrapper.classList.remove('bg-light');
                    break;
                case Theme.Light:
                    chartWrapper.classList.add('bg-light');
                    break;
            }
        });
        document.getElementById('logarithmicOptionCheckInput').addEventListener('input', e => {
            builder.useLogarithmicScale = e.target.checked;
        });
        document.getElementById('copyToClipboardButton').addEventListener('click', e => {
            chartCanvas.toBlob(blob => {
                const item = new ClipboardItem({ 'image/png': blob });
                navigator.clipboard.write([item]);
            });
        });
        document.getElementById('downloadButton').addEventListener('click', e => {
            var link = document.createElement('a');
            link.download = 'chart.png';
            link.href = chartCanvas.toDataURL();
            link.click();
        });
    }
    bindResultsInput(builder) {
        const resultsInput = document.getElementById('resultsInput');
        resultsInput.addEventListener('input', () => {
            loadBenchmarkResult();
        });
        resultsInput.addEventListener('click', () => {
            resultsInput.value = '';
            loadBenchmarkResult();
        }, { once: true });
        loadBenchmarkResult();
        function loadBenchmarkResult() {
            builder.loadBenchmarkResult(resultsInput.value);
        }
    }
    bindSizeControls(chartWrapper) {
        const widthRangeInput = document.getElementById('widthRangeInput');
        const heightRangeInput = document.getElementById('heightRangeInput');
        if (window.screen.width < 992) {
            widthRangeInput.value = '1';
        }
        updateWidth();
        updateHeight();
        widthRangeInput.addEventListener('input', updateWidth);
        heightRangeInput.addEventListener('input', updateHeight);
        function updateWidth() {
            const value = `${parseFloat(widthRangeInput.value) * 100}%`;
            widthRangeInput.title = value;
            chartWrapper.style.width = value;
        }
        function updateHeight() {
            const value = parseFloat(heightRangeInput.value);
            heightRangeInput.title = `${value * 100}%`;
            chartWrapper.style.height = `${value * 1600}px`;
        }
    }
}
new App();
