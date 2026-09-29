if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(
      document.modelContext.registerTool({
        name: 'set_simulation_speed',
        title: 'Set simulation speed',
        description:
          'Pause the civilization simulation or set its real-time speed multiplier.',
        inputSchema: {
          type: 'object',
          properties: {
            multiplier: { type: 'number', enum: [0, 1, 2, 5, 10] },
          },
          required: ['multiplier'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false },
        execute(input) {
          if (!input || ![0, 1, 2, 5, 10].includes(input.multiplier))
            throw Error('Choose 0, 1, 2, 5 or 10.');
          speed = input.multiplier;
          render();
          save();
          return { multiplier: speed, paused: speed === 0 };
        },
      }),
    ).catch(() => {});
  } catch {}
}
