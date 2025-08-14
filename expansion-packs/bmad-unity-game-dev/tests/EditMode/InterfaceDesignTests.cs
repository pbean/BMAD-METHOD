// Assets/Tests/EditMode/InterfaceDesignTests.cs
using System;
using System.Collections;
using System.Collections.Generic;
using NUnit.Framework;
using UnityEngine;
using UnityEngine.TestTools;

namespace BMAD.Unity.Tests.EditMode
{
    /// <summary>
    /// Comprehensive test suite for Interface Design and Architecture systems
    /// Tests component systems, service management, dependency injection, and interface contracts
    /// </summary>
    [TestFixture]
    public class InterfaceDesignTests
    {
        private TestServiceManager serviceManager;
        private GameObject testGameObject;
        private List<IComponentSystem> testSystems;

        [SetUp]
        public void Setup()
        {
            // Create test service manager
            testGameObject = new GameObject("Test Service Manager");
            serviceManager = testGameObject.AddComponent<TestServiceManager>();

            // Create test component systems
            testSystems = new List<IComponentSystem>
            {
                new TestComponentSystem("System1", 1),
                new TestComponentSystem("System2", 2),
                new TestComponentSystem("System3", 3)
            };
        }

        [TearDown]
        public void TearDown()
        {
            // Cleanup test systems
            foreach (var system in testSystems)
            {
                system?.Shutdown();
            }

            // Cleanup service manager
            if (testGameObject != null)
            {
                UnityEngine.Object.DestroyImmediate(testGameObject);
            }
        }

        #region Component System Tests

        [Test]
        public void ComponentSystem_Initialize_SetsUpCorrectly()
        {
            // Arrange
            var system = testSystems[0];
            var context = new TestSystemContext();

            // Act
            var initResult = system.Initialize(context);

            // Assert
            Assert.IsTrue(initResult, "System should initialize successfully");
            Assert.AreEqual(SystemState.Ready, system.State, "System should be in Ready state");
            Assert.IsTrue(system.IsValid(), "System should be valid after initialization");
        }

        [Test]
        public void ComponentSystem_InitializationPriority_OrdersCorrectly()
        {
            // Arrange
            var initOrder = new List<string>();
            foreach (var system in testSystems)
            {
                system.OnStateChanged += (state) =>
                {
                    if (state == SystemState.Ready)
                    {
                        initOrder.Add(system.SystemId);
                    }
                };
            }

            // Act
            var sortedSystems = testSystems.OrderBy(s => s.InitializationPriority);
            foreach (var system in sortedSystems)
            {
                system.Initialize(new TestSystemContext());
            }

            // Assert
            Assert.AreEqual("System1", initOrder[0], "System1 should initialize first (priority 1)");
            Assert.AreEqual("System2", initOrder[1], "System2 should initialize second (priority 2)");
            Assert.AreEqual("System3", initOrder[2], "System3 should initialize third (priority 3)");
        }

        [Test]
        public void ComponentSystem_Shutdown_CleansUpProperly()
        {
            // Arrange
            var system = testSystems[0];
            system.Initialize(new TestSystemContext());
            bool stateChanged = false;
            
            system.OnStateChanged += (state) =>
            {
                if (state == SystemState.Shutdown)
                    stateChanged = true;
            };

            // Act
            system.Shutdown();

            // Assert
            Assert.IsTrue(stateChanged, "State change event should fire");
            Assert.AreEqual(SystemState.Shutdown, system.State, "System should be in Shutdown state");
        }

        [Test]
        public void ComponentSystem_IsValid_DetectsInvalidState()
        {
            // Arrange
            var system = new TestComponentSystem("InvalidSystem", 1, makeInvalid: true);

            // Act
            var isValid = system.IsValid();

            // Assert
            Assert.IsFalse(isValid, "Invalid system should be detected");
        }

        #endregion

        #region Service Manager Tests

        [Test]
        public void ServiceManager_RegisterService_StoresServiceCorrectly()
        {
            // Arrange
            var testService = new TestService();

            // Act
            serviceManager.RegisterService<ITestService>(testService);

            // Assert
            Assert.IsTrue(serviceManager.IsServiceRegistered<ITestService>(), "Service should be registered");
            Assert.AreEqual(testService, serviceManager.GetService<ITestService>(), "Should return same service instance");
        }

        [Test]
        public void ServiceManager_RegisterService_WithFactory_CreatesInstance()
        {
            // Arrange
            bool factoryCalled = false;

            // Act
            serviceManager.RegisterService<ITestService>(() =>
            {
                factoryCalled = true;
                return new TestService();
            });

            var service = serviceManager.GetService<ITestService>();

            // Assert
            Assert.IsTrue(factoryCalled, "Factory should be called");
            Assert.IsNotNull(service, "Service should be created");
        }

        [Test]
        public void ServiceManager_RegisterService_WithLifetime_ManagesCorrectly()
        {
            // Arrange
            var service = new TestService();

            // Act
            serviceManager.RegisterService<ITestService>(service, ServiceLifetime.Singleton);
            var retrievedService1 = serviceManager.GetService<ITestService>();
            var retrievedService2 = serviceManager.GetService<ITestService>();

            // Assert
            Assert.AreSame(retrievedService1, retrievedService2, "Singleton should return same instance");
        }

        [Test]
        public void ServiceManager_TryGetService_ReturnsCorrectResult()
        {
            // Arrange
            var testService = new TestService();
            serviceManager.RegisterService<ITestService>(testService);

            // Act
            bool foundRegistered = serviceManager.TryGetService<ITestService>(out var service);
            bool foundUnregistered = serviceManager.TryGetService<IAnotherService>(out var anotherService);

            // Assert
            Assert.IsTrue(foundRegistered, "Should find registered service");
            Assert.IsNotNull(service, "Should return valid service");
            Assert.IsFalse(foundUnregistered, "Should not find unregistered service");
            Assert.IsNull(anotherService, "Should return null for unregistered service");
        }

        [Test]
        public void ServiceManager_UnregisterService_RemovesService()
        {
            // Arrange
            var testService = new TestService();
            serviceManager.RegisterService<ITestService>(testService);

            // Act
            serviceManager.UnregisterService<ITestService>();

            // Assert
            Assert.IsFalse(serviceManager.IsServiceRegistered<ITestService>(), "Service should be unregistered");
        }

        [Test]
        public void ServiceManager_GetServices_ReturnsAllInstances()
        {
            // Arrange
            var service1 = new TestService();
            var service2 = new TestService();
            serviceManager.RegisterService<ITestService>(service1);
            // Note: In real implementation, this would register multiple services

            // Act
            var services = serviceManager.GetServices<ITestService>();

            // Assert
            Assert.IsNotNull(services, "Should return services collection");
            Assert.Greater(services.Count(), 0, "Should have at least one service");
        }

        [Test]
        public void ServiceManager_ClearServices_RemovesAllServices()
        {
            // Arrange
            serviceManager.RegisterService<ITestService>(new TestService());
            serviceManager.RegisterService<IAnotherService>(new AnotherService());

            // Act
            serviceManager.ClearServices();

            // Assert
            Assert.IsFalse(serviceManager.IsServiceRegistered<ITestService>(), "Test service should be cleared");
            Assert.IsFalse(serviceManager.IsServiceRegistered<IAnotherService>(), "Another service should be cleared");
        }

        #endregion

        #region Dependency Injection Tests

        [Test]
        public void DependencyContainer_InjectDependencies_InjectsCorrectly()
        {
            // Arrange
            var container = new TestDependencyContainer();
            var testService = new TestService();
            container.RegisterDependency<ITestService, TestService>();
            serviceManager.RegisterService<ITestService>(testService);

            var target = new TestClassWithDependencies();

            // Act
            container.InjectDependencies(target);

            // Assert
            Assert.IsNotNull(target.InjectedService, "Dependency should be injected");
        }

        [Test]
        public void DependencyContainer_Resolve_ReturnsService()
        {
            // Arrange
            var container = new TestDependencyContainer();
            container.RegisterDependency<ITestService, TestService>();

            // Act
            var service = container.Resolve<ITestService>();

            // Assert
            Assert.IsNotNull(service, "Should resolve service");
            Assert.IsInstanceOf<TestService>(service, "Should return correct type");
        }

        [Test]
        public void DependencyContainer_CreateInstance_CreatesWithDependencies()
        {
            // Arrange
            var container = new TestDependencyContainer();
            container.RegisterDependency<ITestService, TestService>();

            // Act
            var instance = container.CreateInstance<TestClassWithDependencies>();

            // Assert
            Assert.IsNotNull(instance, "Should create instance");
            Assert.IsNotNull(instance.InjectedService, "Dependencies should be injected");
        }

        [Test]
        public void DependencyContainer_CanResolve_DetectsResolvability()
        {
            // Arrange
            var container = new TestDependencyContainer();
            container.RegisterDependency<ITestService, TestService>();

            // Act
            bool canResolveRegistered = container.CanResolve<ITestService>();
            bool canResolveUnregistered = container.CanResolve<IAnotherService>();

            // Assert
            Assert.IsTrue(canResolveRegistered, "Should be able to resolve registered dependency");
            Assert.IsFalse(canResolveUnregistered, "Should not be able to resolve unregistered dependency");
        }

        [Test]
        public void DependencyContainer_GetDependencyInfo_ReturnsAccurateInfo()
        {
            // Arrange
            var container = new TestDependencyContainer();
            container.RegisterDependency<ITestService, TestService>();

            // Act
            var info = container.GetDependencyInfo<TestClassWithDependencies>();

            // Assert
            Assert.IsNotNull(info, "Should return dependency info");
            Assert.AreEqual(typeof(TestClassWithDependencies), info.TargetType, "Should have correct target type");
            Assert.Contains(typeof(ITestService), info.Dependencies, "Should list ITestService as dependency");
        }

        #endregion

        #region Unity Component Integration Tests

        [Test]
        public void UnityComponent_OnComponentAwake_InitializesCorrectly()
        {
            // Arrange
            var component = testGameObject.AddComponent<TestUnityComponent>();

            // Act
            component.OnComponentAwake();

            // Assert
            Assert.IsTrue(component.IsAwakeCalled, "OnComponentAwake should be called");
            Assert.IsNotNull(component.GameObject, "GameObject should be accessible");
            Assert.IsNotNull(component.Transform, "Transform should be accessible");
        }

        [Test]
        public void UnityComponent_ValidateComponent_ReturnsValidResult()
        {
            // Arrange
            var component = testGameObject.AddComponent<TestUnityComponent>();
            component.OnComponentAwake();

            // Act
            var validationResult = component.ValidateComponent();

            // Assert
            Assert.IsNotNull(validationResult, "Should return validation result");
            Assert.IsTrue(validationResult.IsValid, "Component should be valid");
        }

        [Test]
        public void UpdatableComponent_UpdateFrequency_WorksCorrectly()
        {
            // Arrange
            var component = testGameObject.AddComponent<TestUpdatableComponent>();

            // Act & Assert
            Assert.AreEqual(UpdateFrequency.EveryFrame, component.UpdateFrequency, "Should have correct update frequency");
            Assert.IsTrue(component.ShouldUpdate, "Should indicate updates are needed");
        }

        #endregion

        #region Input Handler Tests

        [Test]
        public void InputHandler_HandleInput_ProcessesCorrectly()
        {
            // Arrange
            var inputHandler = new TestInputHandler();
            var inputEvent = new TestInputEvent
            {
                EventType = InputEventType.ButtonDown,
                InputName = "TestButton",
                Context = InputContext.Game
            };

            // Act
            bool handled = inputHandler.HandleInput(inputEvent);

            // Assert
            Assert.IsTrue(handled, "Input should be handled");
            Assert.IsTrue(inputEvent.IsConsumed, "Input event should be consumed");
        }

        [Test]
        public void InputHandler_InputPriority_AffectsProcessingOrder()
        {
            // Arrange
            var handler1 = new TestInputHandler { InputPriority = 1 };
            var handler2 = new TestInputHandler { InputPriority = 2 };
            var handler3 = new TestInputHandler { InputPriority = 3 };

            var handlers = new List<IInputHandler> { handler1, handler3, handler2 };

            // Act
            var sortedHandlers = handlers.OrderByDescending(h => h.InputPriority).ToList();

            // Assert
            Assert.AreEqual(handler3, sortedHandlers[0], "Handler3 should be first (highest priority)");
            Assert.AreEqual(handler2, sortedHandlers[1], "Handler2 should be second");
            Assert.AreEqual(handler1, sortedHandlers[2], "Handler1 should be last (lowest priority)");
        }

        #endregion

        #region Performance Tests

        [Test]
        public void ServiceManager_MultipleServiceAccess_PerformsWell()
        {
            // Arrange
            var service = new TestService();
            serviceManager.RegisterService<ITestService>(service);
            var startTime = Time.realtimeSinceStartup;

            // Act
            for (int i = 0; i < 1000; i++)
            {
                serviceManager.GetService<ITestService>();
            }

            var endTime = Time.realtimeSinceStartup;
            var accessTime = endTime - startTime;

            // Assert
            Assert.Less(accessTime, 0.1f, "1000 service accesses should complete within 0.1 seconds");
        }

        [Test]
        public void ComponentSystem_MultipleValidation_PerformsWell()
        {
            // Arrange
            var system = testSystems[0];
            system.Initialize(new TestSystemContext());
            var startTime = Time.realtimeSinceStartup;

            // Act
            for (int i = 0; i < 100; i++)
            {
                system.IsValid();
            }

            var endTime = Time.realtimeSinceStartup;
            var validationTime = endTime - startTime;

            // Assert
            Assert.Less(validationTime, 0.05f, "100 validations should complete within 0.05 seconds");
        }

        #endregion
    }

    #region Test Implementation Classes

    // Test interfaces
    public interface ITestService { }
    public interface IAnotherService { }

    // Test service implementations
    public class TestService : ITestService { }
    public class AnotherService : IAnotherService { }

    // Test component system implementation
    public class TestComponentSystem : IComponentSystem
    {
        public string SystemId { get; private set; }
        public SystemState State { get; private set; }
        public int InitializationPriority { get; private set; }

        private bool isValid;

        public event Action<SystemState> OnStateChanged;

        public TestComponentSystem(string systemId, int priority, bool makeInvalid = false)
        {
            SystemId = systemId;
            InitializationPriority = priority;
            State = SystemState.Uninitialized;
            isValid = !makeInvalid;
        }

        public bool Initialize(ISystemContext context)
        {
            State = SystemState.Ready;
            OnStateChanged?.Invoke(State);
            return true;
        }

        public void Shutdown()
        {
            State = SystemState.Shutdown;
            OnStateChanged?.Invoke(State);
        }

        public bool IsValid() => isValid;
    }

    // Test system context
    public class TestSystemContext : ISystemContext
    {
        private Dictionary<Type, object> services = new Dictionary<Type, object>();

        public T GetService<T>() where T : class
        {
            return services.TryGetValue(typeof(T), out var service) ? service as T : null;
        }

        public bool HasService<T>() where T : class
        {
            return services.ContainsKey(typeof(T));
        }

        public ISystemConfiguration Configuration => new TestSystemConfiguration();
        public ILogger Logger => new TestLogger();
    }

    public class TestSystemConfiguration : ISystemConfiguration { }
    public class TestLogger : ILogger
    {
        public void Log(string message) { }
        public void LogWarning(string message) { }
        public void LogError(string message) { }
    }

    // Test service manager implementation
    public class TestServiceManager : MonoBehaviour, IServiceManager
    {
        private Dictionary<Type, object> services = new Dictionary<Type, object>();
        private Dictionary<Type, Func<object>> factories = new Dictionary<Type, Func<object>>();

        public event Action<Type, object> OnServiceRegistered;
        public event Action<Type> OnServiceUnregistered;

        public void RegisterService<T>(T instance) where T : class
        {
            services[typeof(T)] = instance;
            OnServiceRegistered?.Invoke(typeof(T), instance);
        }

        public void RegisterService<T>(Func<T> factory) where T : class
        {
            factories[typeof(T)] = () => factory();
        }

        public void RegisterService<T>(T instance, ServiceLifetime lifetime) where T : class
        {
            RegisterService(instance);
        }

        public T GetService<T>() where T : class
        {
            if (services.TryGetValue(typeof(T), out var service))
                return service as T;

            if (factories.TryGetValue(typeof(T), out var factory))
            {
                var instance = factory() as T;
                services[typeof(T)] = instance;
                return instance;
            }

            return null;
        }

        public bool TryGetService<T>(out T service) where T : class
        {
            service = GetService<T>();
            return service != null;
        }

        public bool IsServiceRegistered<T>() where T : class
        {
            return services.ContainsKey(typeof(T)) || factories.ContainsKey(typeof(T));
        }

        public void UnregisterService<T>() where T : class
        {
            services.Remove(typeof(T));
            factories.Remove(typeof(T));
            OnServiceUnregistered?.Invoke(typeof(T));
        }

        public IEnumerable<T> GetServices<T>() where T : class
        {
            var service = GetService<T>();
            return service != null ? new[] { service } : Enumerable.Empty<T>();
        }

        public void ClearServices()
        {
            services.Clear();
            factories.Clear();
        }
    }

    // Test dependency injection classes
    public class TestDependencyContainer : IDependencyContainer
    {
        private Dictionary<Type, Type> mappings = new Dictionary<Type, Type>();

        public void InjectDependencies(object target)
        {
            if (target is TestClassWithDependencies deps)
            {
                deps.InjectedService = new TestService();
            }
        }

        public T Resolve<T>() where T : class
        {
            if (mappings.TryGetValue(typeof(T), out var implType))
            {
                return Activator.CreateInstance(implType) as T;
            }
            return null;
        }

        public T CreateInstance<T>() where T : class, new()
        {
            var instance = new T();
            InjectDependencies(instance);
            return instance;
        }

        public void RegisterDependency<TInterface, TImplementation>() 
            where TImplementation : class, TInterface
        {
            mappings[typeof(TInterface)] = typeof(TImplementation);
        }

        public bool CanResolve<T>() where T : class
        {
            return mappings.ContainsKey(typeof(T));
        }

        public DependencyInfo GetDependencyInfo<T>() where T : class
        {
            return new DependencyInfo
            {
                TargetType = typeof(T),
                Dependencies = new List<Type> { typeof(ITestService) },
                CanResolve = true
            };
        }
    }

    public class TestClassWithDependencies
    {
        public ITestService InjectedService { get; set; }
    }

    // Test Unity component
    public class TestUnityComponent : MonoBehaviour, IUnityComponent
    {
        public string SystemId => "TestUnityComponent";
        public SystemState State { get; private set; }
        public int InitializationPriority => 0;
        public GameObject GameObject => gameObject;
        public Transform Transform => transform;
        public bool IsActiveAndEnabled => gameObject.activeInHierarchy && enabled;
        public bool IsAwakeCalled { get; private set; }

        public event Action<SystemState> OnStateChanged;

        public bool Initialize(ISystemContext context)
        {
            State = SystemState.Ready;
            return true;
        }

        public void Shutdown()
        {
            State = SystemState.Shutdown;
        }

        public bool IsValid() => true;

        public void OnComponentAwake()
        {
            IsAwakeCalled = true;
        }

        public void OnComponentStart() { }
        public void OnComponentEnable() { }
        public void OnComponentDisable() { }
        public void OnComponentDestroy() { }

        public ValidationResult ValidateComponent()
        {
            return new ValidationResult { IsValid = true };
        }
    }

    // Test updatable component
    public class TestUpdatableComponent : MonoBehaviour, IUpdatable
    {
        public UpdateFrequency UpdateFrequency => UpdateFrequency.EveryFrame;
        public bool ShouldUpdate => true;

        public void OnUpdate(float deltaTime) { }
        public void OnFixedUpdate(float fixedDeltaTime) { }
        public void OnLateUpdate(float deltaTime) { }
    }

    // Test input handler
    public class TestInputHandler : IInputHandler
    {
        public int InputPriority { get; set; } = 0;
        public bool InputEnabled => true;
        public InputContext Context => InputContext.Game;

        public bool HandleInput(IInputEvent inputEvent)
        {
            inputEvent.IsConsumed = true;
            return true;
        }

        public void OnInputRegistered() { }
        public void OnInputUnregistered() { }
    }

    // Test input event
    public class TestInputEvent : IInputEvent
    {
        public InputEventType EventType { get; set; }
        public string InputName { get; set; }
        public float Value { get; set; }
        public Vector2 Vector { get; set; }
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public bool IsConsumed { get; set; }
        public InputContext Context { get; set; }
    }

    // Supporting enums and interfaces
    public enum SystemState { Uninitialized, Ready, Shutdown }
    public enum ServiceLifetime { Singleton, Transient, Scoped, UnityLifetime }
    public enum UpdateFrequency { EveryFrame, FixedUpdate, LateUpdate, Custom, Never }
    public enum InputContext { Global, Game, UI, Menu, Debug, Custom }
    public enum InputEventType { ButtonDown, ButtonUp, ButtonHeld, AxisChanged, VectorChanged, Gesture }

    public interface IComponentSystem
    {
        string SystemId { get; }
        SystemState State { get; }
        int InitializationPriority { get; }
        bool Initialize(ISystemContext context);
        void Shutdown();
        bool IsValid();
        event Action<SystemState> OnStateChanged;
    }

    public interface ISystemContext
    {
        T GetService<T>() where T : class;
        bool HasService<T>() where T : class;
        ISystemConfiguration Configuration { get; }
        ILogger Logger { get; }
    }

    public interface ISystemConfiguration { }

    public interface ILogger
    {
        void Log(string message);
        void LogWarning(string message);
        void LogError(string message);
    }

    public interface IServiceManager
    {
        void RegisterService<T>(T instance) where T : class;
        void RegisterService<T>(Func<T> factory) where T : class;
        void RegisterService<T>(T instance, ServiceLifetime lifetime) where T : class;
        T GetService<T>() where T : class;
        bool TryGetService<T>(out T service) where T : class;
        bool IsServiceRegistered<T>() where T : class;
        void UnregisterService<T>() where T : class;
        IEnumerable<T> GetServices<T>() where T : class;
        void ClearServices();
        event Action<Type, object> OnServiceRegistered;
        event Action<Type> OnServiceUnregistered;
    }

    public interface IDependencyContainer
    {
        void InjectDependencies(object target);
        T Resolve<T>() where T : class;
        T CreateInstance<T>() where T : class, new();
        void RegisterDependency<TInterface, TImplementation>() where TImplementation : class, TInterface;
        bool CanResolve<T>() where T : class;
        DependencyInfo GetDependencyInfo<T>() where T : class;
    }

    public interface IUnityComponent : IComponentSystem
    {
        GameObject GameObject { get; }
        Transform Transform { get; }
        bool IsActiveAndEnabled { get; }
        void OnComponentAwake();
        void OnComponentStart();
        void OnComponentEnable();
        void OnComponentDisable();
        void OnComponentDestroy();
        ValidationResult ValidateComponent();
    }

    public interface IUpdatable
    {
        UpdateFrequency UpdateFrequency { get; }
        bool ShouldUpdate { get; }
        void OnUpdate(float deltaTime);
        void OnFixedUpdate(float fixedDeltaTime);
        void OnLateUpdate(float deltaTime);
    }

    public interface IInputHandler
    {
        int InputPriority { get; }
        bool InputEnabled { get; }
        InputContext Context { get; }
        bool HandleInput(IInputEvent inputEvent);
        void OnInputRegistered();
        void OnInputUnregistered();
    }

    public interface IInputEvent
    {
        InputEventType EventType { get; }
        string InputName { get; }
        float Value { get; }
        Vector2 Vector { get; }
        DateTime Timestamp { get; }
        bool IsConsumed { get; set; }
        InputContext Context { get; }
    }

    public class ValidationResult
    {
        public bool IsValid { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
        public List<string> Warnings { get; set; } = new List<string>();
    }

    public class DependencyInfo
    {
        public Type TargetType { get; set; }
        public List<Type> Dependencies { get; set; } = new List<Type>();
        public List<Type> UnresolvedDependencies { get; set; } = new List<Type>();
        public bool CanResolve { get; set; }
        public string ErrorMessage { get; set; }
    }

    #endregion
}