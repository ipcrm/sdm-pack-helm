import {Success} from "@atomist/automation-client";
import {doWithProject, ExecuteGoal, ProjectAwareGoalInvocation} from "@atomist/sdm";
import {buildHelmArgs} from "../support/buildArgs";
import {determineChartVersion} from "../support/chartData";
import {HelmChartDetail, HelmConfiguration, HelmGoalRegistration, HelmReleaseDetails, HelmReleases} from "../support/interfaces";

export function helmInstallExecution(registration: HelmConfiguration & HelmGoalRegistration): ExecuteGoal {
    return doWithProject(async gi => {
        // Determine Action
        let operationName = registration.operation ? registration.operation : "install";

        // Collect chart details
        let chartDetails: HelmChartDetail;
        if (typeof registration.chartDetails === "object") {
            chartDetails = registration.chartDetails;
        } else if (typeof registration.chartDetails === "function") {
            chartDetails = await registration.chartDetails(registration, gi);
        } else {
            throw new Error("Unknown registration type for chart details!");
        }
        // Get Deployment details
        let releaseDetails: HelmReleaseDetails;
        if (typeof registration.releaseDetails === "object") {
            releaseDetails = registration.releaseDetails;
        } else if (typeof registration.releaseDetails === "function") {
            releaseDetails = await registration.releaseDetails(registration, gi);
        } else {
            throw new Error("Unknown registration type of deployment details!");
        }

        // Get version detail
        const version = await determineChartVersion(chartDetails, gi);

        /**
         * Determine operation details
         *
         * If operation has been set to installOrUpgrade we need to determine if there is already a release present with the same name
         * from releaseDetails.
         */
        if (operationName === "installOrUpgrade") {
            operationName = await determineHelmOperation(operationName, gi, releaseDetails) as "install" | "upgrade";
        }

        // Get Arguments
        const cmdArgs = buildHelmArgs(
            registration.globalOptions,
            registration.cmdArgs,
            chartDetails.options,
            registration.configFiles,
        );

        // Build Command
        let command: string[] = [];
        if (operationName === "install") {
            command = [
                operationName,
                `${chartDetails.registry ? chartDetails.registry + "/" : "local/"}` + chartDetails.name,
                ...version ? ["--version", version] : [],
                "--name",
                releaseDetails.name,
                ...releaseDetails.namespace ? ["--namespace", releaseDetails.namespace] : [],
                ...cmdArgs,
            ];
        } else if (operationName === "upgrade") {
            command = [
                operationName,
                releaseDetails.name,
                `${chartDetails.registry ? chartDetails.registry + "/" : "local/"}` + chartDetails.name,
                ...version ? ["--version", version] : [],
                ...cmdArgs,
            ];
        }

        // Update Repos
        // Execute Install
        const res = await gi.spawn(
            registration.cmd ? registration.cmd : "helm",
            ["repo", "update"],
            {
                logCommand: registration.logCommand ? registration.logCommand : false,
            },
        );

        if (res.code !== 0) {
            return {
                code: res.code,
                message: `Failed to execute helm repo update!`,
            };
        }

        // Execute Install
        const result = await gi.spawn(
            registration.cmd ? registration.cmd : "helm",
            command,
            {
                logCommand: registration.logCommand ? registration.logCommand : false,
            },
        );

        if (result.code !== 0) {
            return {
                code: result.code,
                message: `Failed to execute helm ${operationName}!`,
            };
        }

        return Success;
    });
}

/**
 * Determine operation details
 *
 * If operation has been set to installOrUpgrade we need to determine if there is already a release present with the same name
 * from releaseDetails.
 */
export async function determineHelmOperation(
    operationName: HelmGoalRegistration["operation"],
    gi: ProjectAwareGoalInvocation,
    releaseDetails: HelmReleaseDetails,
): Promise<HelmGoalRegistration["operation"]> {
    let finalOperation: HelmGoalRegistration["operation"];
    if (operationName === "installOrUpgrade") {
        const releases = await gi.exec(
            "helm",
            ["list", "--failed", "--deployed", "--output", "json"],
        );

        const releaseData: HelmReleases = JSON.parse(releases.stdout);
        const thisRelase = releaseData.Releases.filter(r => r.Name === releaseDetails.name)[0];
        if (thisRelase) {
            // check if it's in a healthy state, otherwise - fail
            if (thisRelase.Status === "FAILED") {
                throw new Error(`Helm release ${releaseDetails.name} is in a failed state, cannot upgrade!`);
            }
            finalOperation = "upgrade";
        } else {
            finalOperation = "install";
        }

    }

    if (!finalOperation) {
        throw new Error(`Could not determine operation type for helm install command!`);
    }

    return finalOperation;
}
