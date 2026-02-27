export class EntityManager {
    constructor() {
        this.entities = [];
        this.entitiesToAdd = [];
        this.entitiesToRemove = new Set();
    }

    add(entity) {
        this.entitiesToAdd.push(entity);
    }

    remove(entity) {
        this.entitiesToRemove.add(entity);
    }

    update(dt, map) {
        // Добавляем новые сущности
        if (this.entitiesToAdd.length > 0) {
            this.entities.push(...this.entitiesToAdd);
            this.entitiesToAdd = [];
        }

        // Обновляем все
        for (const entity of this.entities) {
            if (entity.update) {
                entity.update(dt, map, this);
            }
        }

        // Удаляем мертвые/уничтоженные
        if (this.entitiesToRemove.size > 0) {
            let keepCount = 0;
            for (let i = 0; i < this.entities.length; i++) {
                const e = this.entities[i];
                if (!this.entitiesToRemove.has(e)) {
                    this.entities[keepCount++] = e;
                }
            }
            this.entities.length = keepCount; // Truncate cleanly without reallocation
            this.entitiesToRemove.clear();
        }
    }
}
