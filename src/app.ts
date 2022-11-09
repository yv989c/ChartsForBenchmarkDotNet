declare var Chart: any;

import { Log2Axis } from "./log-2-axis";
import { ChartBuilder, Theme, ScaleType, DisplayMode } from "./chart-builder";

class App {
    constructor() {
        Chart.register(Log2Axis);
        Chart.defaults.font.family = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue","Noto Sans","Liberation Sans",Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji"';

        const chartWrapper = document.getElementById('chartWrapper')!;
        const chartCanvas = document.getElementById('chartCanvas') as HTMLCanvasElement;
        const builder = new ChartBuilder(chartCanvas);

        this.bindResultsInput(builder);
        this.bindSizeControls(chartWrapper);

        document.getElementById('scaleRadioContainer')!.addEventListener('input', e => {
            builder.scaleType = (e.target as HTMLInputElement).value as ScaleType;
        });

        document.getElementById('displayRadioContainer')!.addEventListener('input', e => {
            builder.displayMode = (e.target as HTMLInputElement).value as DisplayMode;
        });

        document.getElementById('themeRadioContainer')!.addEventListener('input', e => {
            builder.theme = (e.target as HTMLInputElement).value as Theme;
            switch (builder.theme) {
                case Theme.Dark:
                    chartWrapper.classList.remove('bg-light');
                    break;
                case Theme.Light:
                    chartWrapper.classList.add('bg-light');
                    break;
            }
        });

        document.getElementById('copyToClipboardButton')!.addEventListener('click', e => {
            chartCanvas.toBlob(blob => {
                const item = new ClipboardItem({ 'image/png': blob! });
                navigator.clipboard.write([item]);
            });
        });

        document.getElementById('downloadButton')!.addEventListener('click', e => {
            var link = document.createElement('a');
            link.download = 'chart.png';
            link.href = chartCanvas.toDataURL();
            link.click();
        });

        document.addEventListener('readystatechange', () => {
            if (document.readyState === 'complete') {
                // Fixes MBC Widget Google Pay bug.
                const widgetIFrame = document.querySelector('iframe[title*="Buy Me a Coffee"]');
                if (widgetIFrame !== null) {
                    widgetIFrame.setAttribute('allow', 'payment');
                }
            }
        });
    }

    private bindResultsInput(builder: ChartBuilder) {
        const resultsInput = document.getElementById('resultsInput') as HTMLInputElement;

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

    private bindSizeControls(chartWrapper: HTMLElement) {
        const widthRangeInput = document.getElementById('widthRangeInput') as HTMLInputElement;
        const heightRangeInput = document.getElementById('heightRangeInput') as HTMLInputElement;

        if (document.body.clientWidth < 992) {
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
