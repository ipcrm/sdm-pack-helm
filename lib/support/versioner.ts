import {GitProject} from "@atomist/automation-client";
import {GoalProjectListenerEvent, GoalProjectListenerRegistration, ProgressLog} from "@atomist/sdm";
import {ProjectVersioner, ProjectVersionerRegistration, readSdmVersion} from "@atomist/sdm-core";
import * as df from "dateformat";
import {getChartData, setChartData} from "./chartData";
import {IsHelm} from "./IsHelm";

export const HelmProjectVersionerListener: ProjectVersioner = async (sdmGoal, p, log) => {
    const pi = await getChartData(p);
    const branch = sdmGoal.branch.split("/").join(".");
    const version = `${pi.version}-${branch}.${df(new Date(), "yyyymmddHHMMss")}`;
    await changeHelmVersion(version, p, log);
    return version;
};

export const HelmProjectVersioner: ProjectVersionerRegistration = {
    name: "HelmProjectVersioner",
    versioner: HelmProjectVersionerListener,
};

export const changeHelmVersion = async (version: string, p: GitProject, log: ProgressLog): Promise<void> => {
    log.write(`Attempting to update local working project to new helm chart version ${version}...`);
    await setChartData(p, version);
    log.write(`Helm chart version updated.`);
};

/**
 * Project listener that runs [[changeHelmVersion]] before executing goal.
 */
export const HelmVersionProjectListener: GoalProjectListenerRegistration = {
    events: [GoalProjectListenerEvent.before],
    listener: async (p, r) => {
        const version = await readSdmVersion(
            r.goalEvent.repo.owner,
            r.goalEvent.repo.name,
            r.goalEvent.repo.providerId,
            r.goalEvent.sha,
            r.goalEvent.branch,
            r.context,
        );
        await changeHelmVersion(version, p, r.progressLog);
    },
    name: "helm version",
    pushTest: IsHelm,
};
