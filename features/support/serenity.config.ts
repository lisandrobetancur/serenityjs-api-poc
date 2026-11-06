import { setDefaultTimeout } from '@cucumber/cucumber';
import { ConsoleReporter } from '@serenity-js/console-reporter';
import { ArtifactArchiver, configure } from '@serenity-js/core';
import { SerenityBDDReporter } from '@serenity-js/serenity-bdd';

import { environment } from '../../src/config/environment';
import { Actors } from '../../src/screenplay';

setDefaultTimeout(environment.requestTimeout * 3);

configure({
    actors: new Actors(),
    crew: [
        ConsoleReporter.fromJSON({ theme: 'auto' }),
        SerenityBDDReporter.fromJSON({ specDirectory: 'features' }),
        ArtifactArchiver.fromJSON({ outputDirectory: 'target/site/serenity' }),
    ],
});
