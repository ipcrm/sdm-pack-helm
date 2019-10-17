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
import {helmPackageExecution} from "../support/executePackage";
import {HelmConfiguration, HelmPackageRegistration} from "../support/interfaces";

const HelmPackageGoalDefinition: GoalDefinition = {
    displayName: "Running: Helm Package",
    uniqueName: "helm-package",
    environment: IndependentOfEnvironment,
    workingDescription: "Working: Helm Package",
    completedDescription: "Completed: Helm Package",
    failedDescription: "Failed: Helm Package",
    waitingForApprovalDescription: "Waiting for approval: Helm Package",
    waitingForPreApprovalDescription: "Waiting to start: Helm Package",
    stoppedDescription: "Stopped: Helm Package",
    canceledDescription: "Cancelled: Helm Package",
    retryFeasible: true,
};

export class HelmPackage extends FulfillableGoalWithRegistrations<HelmConfiguration> {
    // tslint:disable-next-line
    constructor(protected details: FulfillableGoalDetails | string = DefaultGoalNameGenerator.generateName("helm-package"),
                ...dependsOn: Goal[]) {

        super({
            ...HelmPackageGoalDefinition,
            ...getGoalDefinitionFrom(details, DefaultGoalNameGenerator.generateName("ansible-package")),
        }, ...dependsOn);
    }

    public with(
        registration: HelmConfiguration & HelmPackageRegistration,
    ): this {
        // tslint:disable-next-line:no-object-literal-type-assertion
        this.addFulfillment({
            name: DefaultGoalNameGenerator.generateName("helm-package"),
            goalExecutor: helmPackageExecution(registration),
        } as Implementation);
        return this;
    }
}
