import {projectUtils} from "@atomist/automation-client";
import {predicatePushTest, PredicatePushTest} from "@atomist/sdm";

export const IsHelm: PredicatePushTest = predicatePushTest(
    "IsHelm",
    async p => {
        return projectUtils.fileExists(p, ["**/Chart.y{,a}ml", "Chart.y{,a}ml"]);
    },
);
