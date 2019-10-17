import {HelmChartDetail, HelmConfiguration, HelmGoalRegistration} from "./interfaces";

/**
 * Build complete arguments list
 *
 * First the Record objects are applied in this order:
 *  Global -> HelmGoalRegistration.cmdArgs -> ChartDetails.options
 *
 * Then the string arguments are applied and uniq'd in the same order
 */
export function buildHelmArgs(
    globalOptions: HelmConfiguration["globalOptions"],
    goalArgs: HelmGoalRegistration["cmdArgs"],
    chartOptions: HelmChartDetail["options"],
    configFiles: HelmGoalRegistration["configFiles"],
): string[] {
    const bareArgs: string[] = [];
    let valueArgs: Record<string, string> = {};

    // Collect all arguments into single datastructure
    if (globalOptions) {
        valueArgs = globalOptions.filter(c => typeof c === "object") as unknown as Record<string, string>;
        bareArgs.push(...globalOptions.filter(c => typeof c === "string") as string[]);
    }
    if (goalArgs) {
        valueArgs = {
            ...valueArgs,
            ...goalArgs.filter(c => typeof c === "object") as unknown as Record<string, string>,
        };
        bareArgs.push(...goalArgs.filter(c => typeof c === "string") as string[]);
    }
    if (chartOptions) {
        valueArgs = {
            ...valueArgs,
            ...chartOptions.filter(c => typeof c === "object") as unknown as Record<string, string>,
        };
        bareArgs.push(...chartOptions.filter(c => typeof c === "string") as string[]);
    }

    // Create array of all arguments
    const returnArgs: string[] = [];
    if (configFiles) {
        configFiles.forEach(c => {
            returnArgs.push(`-f`, `${c}`);
        });
    }

    Object.keys(valueArgs).forEach(a => {
        returnArgs.push(`--${a}`, `${valueArgs[a]}`);
    });

    return returnArgs;
}
