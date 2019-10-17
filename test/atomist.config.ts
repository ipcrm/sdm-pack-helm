/*
 * Copyright © 2019 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
    configure,
    Version,
} from "@atomist/sdm-core";
import {HelmDeploy} from "../lib/goal/install";
import {HelmPackage} from "../lib/goal/package";
import {getChartData} from "../lib/support/chartData";
import {IsHelm} from "../lib/support/IsHelm";
import {HelmProjectVersioner, HelmVersionProjectListener} from "../lib/support/versioner";

export const configuration = configure(async sdm => {
    return {
        version: {
            test: IsHelm,
            goals: [
                new Version()
                    .with(HelmProjectVersioner),
            ],
        },
        package: {
            test: IsHelm,
            dependsOn: "version",
            goals: [
                new HelmPackage()
                    .with({
                        push: {
                            registry: "http://localhost:8080/api/charts",
                        },
                    })
                    .withProjectListener(HelmVersionProjectListener),
            ],
        },
        release: {
            test: IsHelm,
            dependsOn: "package",
            goals: [
                new HelmDeploy()
                    .with({
                        operation: "installOrUpgrade",
                        releaseDetails: async (h, gi) => {
                            const chart = await getChartData(gi.project);
                            return { name: chart.name, namespace: chart.name };
                        },
                        chartDetails: async (h, gi) => {
                            const chart = await getChartData(gi.project);
                            return { name: chart.name, registry: "chartmuseum" };
                        },
                        logCommand: true,
                    }),
            ],
        },
    };
});
