import {GitProject, projectUtils} from "@atomist/automation-client";
import {ProjectAwareGoalInvocation} from "@atomist/sdm";
import {readSdmVersion} from "@atomist/sdm-core";
import * as yaml from "js-yaml";
import {Error} from "tslint/lib/error";
import {HelmChartDetail} from "./interfaces";

export async function getChartData(
    p: GitProject,
): Promise<Pick<HelmChartDetail, "name"|"version">> {
    let data: Pick<HelmChartDetail, "name"|"version"> = {} as any;
    await projectUtils.doWithFiles(p, ["**/Chart.y{,a}ml", "Chart.y{,a}ml"], async f => {
        const chartData = yaml.safeLoad(await f.getContent());
        data = {
            name: chartData.name,
            version: chartData.version,
        };
    });

    if (data) {
        return data;
    } else {
        throw new Error(`Cannot find Chart.yaml`);
    }
}

export async function setChartData(
    p: GitProject,
    version: string,
): Promise<GitProject> {
    await projectUtils.doWithFiles(p, ["**/Chart.y{,a}ml", "Chart.y{,a}ml"], async f => {
        const chartData = yaml.safeLoad(await f.getContent());
        chartData.version = version;
        await f.setContent(yaml.safeDump(chartData));
    });
    return p;
}

/**
 * Used to determine chart version from a couple sources.  First, will check for a version set by a versioner goal, otherwise read the chart version
 * from the Chart.yaml in the project.
 *
 * @param {HelmChartDetail} chartDetails
 * @param {ProjectAwareGoalInvocation} gi
 */
export async function determineChartVersion(
    chartDetails: HelmChartDetail,
    gi: ProjectAwareGoalInvocation,
): Promise<string|undefined> {
    // Figure out version
    if (chartDetails.version) {
        return chartDetails.version;
    } else {
        const ver = await readSdmVersion(
            gi.goalEvent.repo.owner,
            gi.goalEvent.repo.name,
            gi.goalEvent.repo.providerId,
            gi.goalEvent.sha,
            gi.goalEvent.branch,
            gi.context,
        );

        if (ver) {
            return ver;
        } else {
            const chart = await getChartData(gi.project);
            if (chart.version) {
                return chart.version;
            }
        }
    }

    return;
}
