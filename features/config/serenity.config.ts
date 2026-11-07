import { ConsoleReporter } from '@serenity-js/console-reporter';
import { ArtifactArchiver, configure, Duration } from '@serenity-js/core';
import { SerenityBDDReporter } from '@serenity-js/serenity-bdd';

import { Actors } from '../../src/screenplay';

/**
 * Serenity/JS configuration: the Cast and the stage crew (reporters).
 *
 * The report's Context column shows the environment; the Serenity/JS reporter does not fill it, so
 * `scripts/set-report-context.ts` writes it into the JSON results before the HTML report is generated.
 */
configure({
    actors: new Actors(),
    crew: [
        ConsoleReporter.fromJSON({ theme: 'auto' }),
        SerenityBDDReporter.fromJSON({ specDirectory: 'features' }),
        ArtifactArchiver.fromJSON({ outputDirectory: 'target/site/serenity' }),
    ],
    cueTimeout: Duration.ofSeconds(10),
    interactionTimeout: Duration.ofMinutes(5),
});
