import {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

export class ShopGraph implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ShopGraph',
		name: 'shopGraph',
		icon: 'file:shopgraph.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Authenticated product data extraction',
		defaults: {
			name: 'ShopGraph',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'shopGraphApi',
				required: true,
			},
		],
		properties: [
			// ------ Operation selector ------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Enrich',
						value: 'enrich',
						description: 'Extract product data from a URL',
						action: 'Extract product data from a URL',
					},
					{
						name: 'Enrich HTML',
						value: 'enrichHtml',
						description: 'Extract product data from raw HTML',
						action: 'Extract product data from raw HTML',
					},
				],
				default: 'enrich',
			},

			// ------ URL field (enrich operation) ------
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				required: true,
				default: '',
				placeholder: 'https://example.com/product/blue-widget',
				description: 'Product page URL to extract data from',
				displayOptions: {
					show: {
						operation: ['enrich'],
					},
				},
			},

			// ------ HTML field (enrichHtml operation) ------
			{
				displayName: 'HTML',
				name: 'html',
				type: 'string',
				typeOptions: {
					rows: 6,
				},
				required: true,
				default: '',
				placeholder: '<html>...</html>',
				description: 'Raw HTML of the product page',
				displayOptions: {
					show: {
						operation: ['enrichHtml'],
					},
				},
			},

			// ------ Format (shared across both operations) ------
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: [
					{
						name: 'ShopGraph',
						value: 'shopgraph',
					},
					{
						name: 'UCP',
						value: 'ucp',
					},
				],
				default: 'shopgraph',
				description: 'Response format for the extracted product data',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const format = this.getNodeParameter('format', i) as string;

				const credentials = await this.getCredentials('shopGraphApi');
				const baseUrl = ((credentials.baseUrl as string) || 'https://shopgraph.dev').replace(
					/\/$/,
					'',
				);

				const body: Record<string, unknown> = {
					format,
				};

				switch (operation) {
					case 'enrich': {
						body.url = this.getNodeParameter('url', i) as string;
						break;
					}
					case 'enrichHtml': {
						body.html = this.getNodeParameter('html', i) as string;
						break;
					}
					default:
						throw new NodeOperationError(
							this.getNode(),
							`Unknown operation: ${operation}`,
							{ itemIndex: i },
						);
				}

				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'shopGraphApi',
					{
						method: 'POST',
						url: `${baseUrl}/api/enrich`,
						body,
						json: true,
					},
				);

				returnData.push({
					json: responseData as IDataObject,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
