import {ProjectAwareGoalInvocation} from "@atomist/sdm";

/**
 * Global Helm Configuration Options
 */
export interface HelmConfiguration {
    /**
     * Specify path to the helm command.  Optional.  If not passed assumed this command
     * will be in the current path.
     */
    cmd?: string;

    /**
     * Cluster context.  Optional.  If not supplied the default context will be used.
     */
    k8sContext?: string;

    /**
     * Global Options.  Optional.  If supplied, these arguments will be passed to all helm goals
     */
    globalOptions?: Array<Record<string, string>| string>;

    /**
     * Log command.  Default: false.   Should the goal log include the full helm command that was run?  Potentially sensitive data
     * could be exposed if using basic auth
     */
    logCommand?: boolean;
}

/**
 * Chart Details
 */
export interface HelmChartDetail {
    name: string;
    version?: string;

    /**
     * Registry is prepended to the name of the chart.  When an install/upgrade is run, this becomes <registry>/<chartName>.
     * Optional.  Defaults to "local".
     */
    registry?: string;

    /**
     * Additional Options.  These detials will be passed to the `helm package` or `helm install` commands. They
     * should be supplied as an option for arguments with values, example {argName: "value"}.  For arguments without
     * values required simply pass the name of the arguments (no dashes, etc).
     */
    options?: Array<Record<string, string>| string>;
}

export interface HelmReleaseDetails {
    /**
     * Set the name of this helm release
     */
    name: string;

    /**
     * Set what namespace this release should utilize
     */
    namespace?: string;
}

/**
 * Used to programmatically create chart details for use with the `helm install` or `helm package` commands
 */
export type HelmChartDetailCreator = (registration: HelmGoalRegistration, r: ProjectAwareGoalInvocation) => Promise<HelmChartDetail>;

/**
 * Used to programmatically create chart details for use with the `helm package` command
 */
export type HelmPackageDetailCreator = (registration: HelmPackageRegistration, r: ProjectAwareGoalInvocation) => Promise<Pick<HelmChartDetail, "version">>;

/**
 * Used to programmatically create release details for use with the `helm install` or `helm package` commands
 */
export type HelmReleaseDetailCreator = (registration: HelmGoalRegistration, r: ProjectAwareGoalInvocation) => Promise<HelmReleaseDetails>;

/**
 * This interface is used to define the details about a given helm chart release
 */
export interface HelmGoalRegistration {
    /**
     * Deployment Info
     */
    releaseDetails: HelmReleaseDetails | HelmReleaseDetailCreator;

    /**
     * Chart Name
     */
    chartDetails: HelmChartDetail | HelmChartDetailCreator;

    /**
     * Operation to use.  Defaults to install.
     *
     * install: Create the release for the first time.
     * upgrade: Upgrade the existing release
     * installOrUpgrade: The goal will actively check if there is already a release for the supplied releaseDetails.  If present, the operation
     *                   will automatically be changed to upgrade.
     */
    operation?: "install" | "upgrade" | "installOrUpgrade";

    /**
     * Optionally supply additional command arguments to the `helm install` command.
     *
     * For arguments that take a value, populate an object of {argName: "value"}, otherwise just supply
     * the bare argument name.  The required dashes, etc will be added automatically.
     */
    cmdArgs?: Array<Record<string, string> | string>;

    /**
     * Optionally set environment variables to be set when the `helm install` command executes
     */
    envArgs?: Record<string, string>;

    /**
     * Config files. Optional. Will be passed to helm command with `-f` in the order supplied
     */
    configFiles?: string[];
}

export interface HelmPackageRegistration {
    /**
     * Path to the chart source.  Defaults to current directory.
     */
    source?: string;

    /**
     * Set the version on the chart to this semver version.  By default this is read from the Chart.yaml, however
     * there may be a desire to supply a different value or lookup the value programmatically.  Optional.
     */
    version?: string | HelmPackageDetailCreator;

    /**
     * set the appVersion on the chart to this version
     */
    appVersion?: string;

    /**
     * update dependencies from "requirements.yaml" to dir "charts/" before packaging
     */
    dependencyUpdate?: boolean;

    /**
     * location to write the chart. (default ".")
     */
    destination?: string;

    /**
     * use a PGP private key to sign this package
     */
    sign?: string;

    /**
     * name of the key to use when signing. Used if --sign is true
     */
    key?: string;

    /**
     * location of a public keyring (default "/Users/<user>/.gnupg/pubring.gpg")
     */
    keyring?: string;

    /**
     * save packaged chart to local chart repository (default true)
     */
    save?: boolean;

    /**
     * Push to helm chart repository?  Unless details are supplied, no push is attempted
     */
    push?: {
        registry: string;
        username?: string;
        password?: string;
        token?: string;

        /**
         * Optionally supply values directly to the requests library for upload.  Use with care!
         */
        options?: Record<string, string>;
    };
}

/**
 * The following interfaces describe the json output from helm list
 */
export interface HelmRelease {
    Name: string;
    Revision: number;
    Updated: string;
    Status: string;
    Chart: string;
    AppVersion: string;
    Namespace: string;
}
export interface HelmReleases {
    Releases: HelmRelease[];
}
