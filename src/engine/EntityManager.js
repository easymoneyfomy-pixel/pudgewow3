export class EntityManager {
    constructor() {
        this.entities = [];
        this.entitiesToAdd = [];
        this.entitiesToRemove = [];
    }

    add(entity) {
        this.entitiesToAdd.push(entity);
    }

    remove(entity) {
        this.entitiesToRemove.push(entity);
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
        if (this.entitiesToRemove.length > 0) {
            this.entities = this.entities.filter(e => !this.entitiesToRemove.includes(e));
            this.entitiesToRemove = [];
        }
    }
}
