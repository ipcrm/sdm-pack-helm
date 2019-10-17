import {Success} from "@atomist/automation-client";
import {doWithProject, ExecuteGoal, ProjectAwareGoalInvocation} from "@atomist/sdm";
import * as fs from "fs-extra";
import * as request from "request-promise-native";
import {getChartData} from "../support/chartData";
import {HelmConfiguration, HelmPackageRegistration} from "../support/interfaces";

export function helmPackageExecution(registration: HelmConfiguration & HelmPackageRegistration): ExecuteGoal {
    return doWithProject(async gi => {
        gi.progressLog.write(`Determining helm chart name and version...`);
        // Set Version
        let version;
        if (registration.version && typeof registration.version === "string") {
            version = registration.version;
        } else if (typeof registration.version === "function") {
            version = (await registration.version(registration, gi)).version;
        }

        // Get Chart name
        const chart = await getChartData(gi.project);
        gi.progressLog.write(`Set helm chart name and version to ${chart.name}:${chart.version}`);

        // Set version based on in project data if it wasn't set through another means
        if (!version) {
            version = chart.version;
        }

        // Create Chart Build Directory
        await createChartBuildDir(chart.name, registration, gi);

        // Build command & args
        const command = buildPackageCommandArgs(registration, chart.version);

        // Execute Package Command
        gi.progressLog.write(`Executing helm package...`);
        const result = await gi.spawn(
            registration.cmd ? registration.cmd : "helm",
            command,
            {
                cwd: `${gi.project.baseDir}/${chart.name}`,
            },
        );
        if (result.code !== 0) {
            return {
                code: result.code,
                message: `Failed to execute helm package!`,
            };
        }

        // If push to chart repository is enabled, execute
        if (registration.push) {
            await uploadChart(
                gi,
                registration,
                chart.name,
                `${gi.project.baseDir}/${chart.name}/${chart.name}-${version}.tgz`,
                version as string,
            );
        }

        gi.progressLog.write(`Success!`);
        return Success;
    });
}

/**
 * When building helm charts, the base directory name must match the chart being built.  This function
 * creates a new subdirectory within the checked out source named after the chart that contains only the
 * contents that belong to the helm chart.
 *
 * @param {string} chartName
 * @param {HelmConfiguration & HelmPackageRegistration} registration
 * @param {ProjectAwareGoalInvocation} gi
 */
async function createChartBuildDir(
    chartName: string,
    registration: HelmConfiguration & HelmPackageRegistration,
    gi: ProjectAwareGoalInvocation,
): Promise<void> {
    // Set Source
    const source = registration.source ? `${gi.project.baseDir}/${registration.source}` : gi.project.baseDir;

    // Create subdir that matches chart name
    await fs.mkdir(`${gi.project.baseDir}/${chartName}`);

    // Required files
    gi.progressLog.write(`Copying required folders and files to temporary chart build directory...`);
    await fs.copy(`${source}/templates`, `${gi.project.baseDir}/${chartName}/templates`);
    await fs.copyFile(`${source}/Chart.yaml`, `${gi.project.baseDir}/${chartName}/Chart.yaml`);
    await fs.copyFile(`${source}/values.yaml`, `${gi.project.baseDir}/${chartName}/values.yaml`);

    // Optionals
    const prefix = registration.source ? `${registration.source}` : "";
    if (await gi.project.hasFile(`${prefix}README.md`)) {
        gi.progressLog.write(`Copying optional README.md file to temporary chart build directory...`);
        await fs.copyFile(`${source}/README.md`, `${gi.project.baseDir}/${chartName}/README.md`);
    }
    if (await gi.project.hasFile(`${prefix}requirements.yaml`)) {
        gi.progressLog.write(`Copying optional requirements.yaml file to temporary chart build directory...`);
        await fs.copyFile(`${source}/requirements.yaml`, `${gi.project.baseDir}/${chartName}/requirements.yaml`);
    }
    if (await gi.project.hasFile(`${prefix}requirements.lock`)) {
        gi.progressLog.write(`Copying optional requirements.lock file to temporary chart build directory...`);
        await fs.copyFile(`${source}/requirements.lock`, `${gi.project.baseDir}/${chartName}/requirements.lock`);
    }
    if (await gi.project.hasFile(`${prefix}.helmignore`)) {
        gi.progressLog.write(`Copying optional .helmignore file to temporary chart build directory...`);
        await fs.copyFile(`${source}/.helmignore`, `${gi.project.baseDir}/${chartName}/.helmignore`);
    }
    if (await gi.project.hasDirectory(`${prefix}ci`)) {
        gi.progressLog.write(`Copying optional ci folder to temporary chart build directory...`);
        await fs.copy(`${source}/ci`, `${gi.project.baseDir}/${chartName}/ci`);
    }
}

/**
 * Build Argument list for running helm package
 *
 * @param registration
 * @param version
 */
function buildPackageCommandArgs(registration: HelmConfiguration & HelmPackageRegistration, version: string | undefined): string[] {
    return [
        "package",
        registration.source ? registration.source : ".",
        ...version ? ["--version", version] : [],
        ...registration.appVersion ? ["--app-version", registration.appVersion] : [],
        ...registration.dependencyUpdate ? ["-u"] : [],
        ...registration.destination ? ["-d", registration.destination] : [],
        ...registration.key ? ["--key", registration.key] : [],
        ...registration.keyring ? ["--keyring", registration.keyring] : [],
        ...registration.save ? ["--save"] : [],
        ...registration.sign ? ["--sign"] : [],
    ];
}

/**
 * Upload a helm chart to a package repository
 *
 * @param {ProjectAwareGoalInvocation} gi
 * @param {HelmConfiguration & HelmPackageRegistration} registration
 * @param {string} chartName
 * @param {string} version
 */
async function uploadChart(
    gi: ProjectAwareGoalInvocation,
    registration: HelmConfiguration & HelmPackageRegistration,
    chartName: string,
    chartFilePath: string,
    version: string,
): Promise<void> {
    if (registration.push) {
        gi.progressLog.write(`Uploading helm package to registry ${registration.push.registry}...`);
        const options: request.OptionsWithUri = {
            method: "POST",
            uri: registration.push.registry,
            body: await fs.createReadStream(chartFilePath),
            // tslint:disable-next-line:no-null-keyword
            encoding: null,
        };

        if (registration.push.username && registration.push.password) {
            options.auth = {
                username: registration.push.username,
                password: registration.push.password,
            };
        } else if (registration.push.token) {
            options.auth = {
                bearer: registration.push.token,
            };
        }

        try {
            await request.post({
                ...options,
                ...registration.push.options,
            });
        } catch (e) {
            throw new Error(`Failed to upload chart. Error Code: ${e.statusCode}, ${e.error}`);
        }
    }
}
