import {
	IAuthenticateGeneric,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ShopGraphApi implements ICredentialType {
	name = 'shopGraphApi';
	displayName = 'ShopGraph API';
	documentationUrl = 'https://shopgraph.dev/tools/api';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			placeholder: 'sg_live_...',
			description:
				'Your ShopGraph API key. Get one at shopgraph.dev/dashboard.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://shopgraph.dev',
			placeholder: 'https://shopgraph.dev',
			description:
				'Base URL for the ShopGraph API. Only change this if using a self-hosted instance.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};
}
