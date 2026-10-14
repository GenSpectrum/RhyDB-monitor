import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { FC } from 'react';

type RhyDBSection = {
    sectionName: string;
    instances: RhyDBInstance[];
};

type RhyDBInstance = {
    name: string;
    url: string;
};

type RhyDBInfo = {
    version: string;
    sequenceCount: number;
};

type RhyDBHealth = {
    status: string;
};

const config = [
    {
        sectionName: 'GenSpectrum staging',
        instances: [
            {
                name: 'SARS-CoV-2',
                url: 'https://gs-staging-1.int.genspectrum.org/open/v2/silo',
            },
            {
                name: 'All Pathoplexus organisms',
                url: 'https://gs-staging-1.int.genspectrum.org/pathoplexus',
            },
        ],
    },
    {
        sectionName: 'Swiss Wastewater',
        instances: [
            {
                name: 'SARS-CoV-2',
                url: 'https://silo.wasap.genspectrum.org/covid',
            },
            {
                name: 'RSV-A',
                url: 'https://silo.wasap.genspectrum.org/rsva',
            },
            {
                name: 'RSV-B',
                url: 'https://silo.wasap.genspectrum.org/rsvb',
            },
        ],
    },
] satisfies RhyDBSection[];

const queryClient = new QueryClient();

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            {config.map((section) => (
                <RhyDBSection key={section.sectionName} section={section} />
            ))}
        </QueryClientProvider>
    );
}

export default App;

function RhyDBSection({ section }: { section: RhyDBSection }) {
    return (
        <div className='m-10'>
            <details open className='collapse collapse-arrow bg-base-200'>
                <summary className='collapse-title text-xl font-medium'>{section.sectionName}</summary>
                <div className='collapse-content flex flex-wrap'>
                    {section.instances.map((instance) => (
                        <RhyDBInstance key={instance.url} instance={instance} />
                    ))}
                </div>
            </details>
        </div>
    );
}

function RhyDBInstance({ instance }: { instance: RhyDBInstance }) {
    return (
        <div className='card card-bordered m-2 max-w-xl flex-grow bg-base-100 shadow-xl'>
            <div className='card-body'>
                <h2 className='card-title'>{instance.name}</h2>
                <a className='link' href={`${instance.url}/info`}>
                    {instance.url}
                </a>
                <div className='divider' />
                <RhyDBData instance={instance} />
            </div>
        </div>
    );
}

const every30Seconds = 30000;

function RhyDBData({ instance }: { instance: RhyDBInstance }) {
    const { data, error, isLoading } = useRhyDBQuery<RhyDBInfo>(instance, 'info');

    if (isLoading) {
        return <div className='loading loading-spinner' />;
    }

    if (error) {
        console.error(error);
        return <div className='alert alert-error'>{JSON.stringify(error.message)}</div>;
    }

    if (data === undefined) {
        return null;
    }

    return (
        <ul>
            <li>
                <p className='flex items-center'>
                    <span className='iconify mr-1 mdi--heart-pulse' />
                    <Health instance={instance} />
                </p>
            </li>
            <li>
                <p className='flex items-center'>
                    <span className='iconify mr-1 mdi--hashtag' />
                    Number of sequences: {data.body.sequenceCount.toLocaleString()}
                </p>
            </li>
            <li>
                <p className='flex items-center'>
                    <span className='iconify mr-1 mdi--tag' />
                    RhyDB version: <VersionLink version={data.body.version} repoUrl='https://github.com/RhyOrg/RhyDB' />
                </p>
            </li>
            <DataVersion dataVersion={data.dataVersion} />
        </ul>
    );
}

function useRhyDBQuery<T>(instance: RhyDBInstance, endpoint: string) {
    return useQuery({
        queryKey: ['instance', instance.url, endpoint],
        queryFn: async () => {
            const response = await fetch(`${instance.url}/${endpoint}`);
            if (!response.ok) {
                throw new Error(await response.text());
            }
            return {
                body: (await response.json()) as T,
                dataVersion: response.headers.get('data-version'),
            };
        },
        refetchInterval: every30Seconds,
    });
}

const DataVersion: FC<{ dataVersion: string | null }> = ({ dataVersion }) => {
    if (dataVersion === null) {
        return (
            <li>
                <div
                    className='tooltip'
                    data-tip='The server does not list the data-version header in Access-Control-Expose-Headers.'
                >
                    <p className='flex items-center text-left'>
                        <span className='iconify mr-1 mdi--update' />
                        Data version: unknown
                    </p>
                </div>
            </li>
        );
    }

    const dataVersionDate = new Date(Number(dataVersion) * 1000);
    const lastUpdatedDate = dataVersionDate.toUTCString();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const dataIsOld = dataVersionDate < oneWeekAgo;

    return (
        <>
            <li>
                <p className='flex items-center'>
                    <span className='iconify mr-1 mdi--update' />
                    Data version: {dataVersion}
                </p>
            </li>
            <li>
                <div
                    className={`tooltip ${dataIsOld ? 'text-red-500' : ''}`}
                    data-tip={dataIsOld ? 'Data was not updated since more than a week.' : 'Data was updated recently.'}
                >
                    <p className='flex items-center text-left'>
                        <span className='iconify mr-1 mdi--calendar' />
                        Last updated: {lastUpdatedDate}
                    </p>
                </div>
            </li>
        </>
    );
};

const Health: FC<{ instance: RhyDBInstance }> = ({ instance }) => {
    const { data, error, isLoading } = useRhyDBQuery<RhyDBHealth>(instance, 'health');

    if (isLoading) {
        return <span className='loading loading-spinner' />;
    }

    if (error) {
        console.error(error);
        return <span className='alert alert-error'>{JSON.stringify(error.message)}</span>;
    }

    return <span className={data?.body.status === 'UP' ? '' : 'text-red-500'}>Health status: {data?.body.status}</span>;
};

const VersionLink: FC<{ version: string | undefined; repoUrl: string }> = ({ version, repoUrl }) => {
    if (!version) {
        return 'undefined';
    }

    const versionLink = version.includes('.') ? `${repoUrl}/releases/tag/v${version}` : `${repoUrl}/commit/${version}`;

    return (
        <a className='link ml-1' href={versionLink}>
            {version.substring(0, 7)}
        </a>
    );
};
