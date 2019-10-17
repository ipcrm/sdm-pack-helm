import {
    DefaultGoalNameGenerator,
    FulfillableGoalDetails,
    FulfillableGoalWithRegistrations,
    getGoalDefinitionFrom,
    Goal,
    GoalDefinition,
    Implementation,
    IndependentOfEnvironment,
} from "@atomist/sdm";
import {HelmConfiguration, HelmGoalRegistration} from "../support/interfaces";
import {helmInstallExecution} from "./executeInstall";

const HelmDeployGoalDefinition: GoalDefinition = {
    displayName: "Running: Helm",
    uniqueName: "helm-deploy",
    environment: IndependentOfEnvironment,
    workingDescription: "Working: Helm Deploy",
    completedDescription: "Completed: Helm Deploy",
    failedDescription: "Failed: Helm Deploy",
    waitingForApprovalDescription: "Waiting for approval: Helm Deploy",
    waitingForPreApprovalDescription: "Waiting to start: Helm Deploy",
    stoppedDescription: "Stopped: Helm Deploy",
    canceledDescription: "Cancelled: Helm Deploy",
    retryFeasible: true,
};

export class HelmDeploy extends FulfillableGoalWithRegistrations<HelmConfiguration> {
    // tslint:disable-next-line
    constructor(protected details: FulfillableGoalDetails | string = DefaultGoalNameGenerator.generateName("helm-deploy"),
                ...dependsOn: Goal[]) {

        super({
            ...HelmDeployGoalDefinition,
            ...getGoalDefinitionFrom(details, DefaultGoalNameGenerator.generateName("helm-deploy")),
        }, ...dependsOn);
    }

    public with(
        registration: HelmConfiguration & HelmGoalRegistration,
    ): this {
        // tslint:disable-next-line:no-object-literal-type-assertion
        this.addFulfillment({
            name: DefaultGoalNameGenerator.generateName("helm-deploy"),
            goalExecutor: helmInstallExecution(registration),
        } as Implementation);
        return this;
    }
}
